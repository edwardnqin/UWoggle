"""
room_service.py

Service layer for multiplayer room management.
"""

from __future__ import annotations

import random
import string
import requests
import os
import logging
from typing import Any, Tuple

logger = logging.getLogger(__name__)

GAME_SERVICE_URL = os.environ.get("GAME_SERVICE_URL", "http://localhost:8080")


def _generate_room_code(conn) -> str:
    """Generate a unique 6-character uppercase alphanumeric room code."""
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM multiplayer_rooms WHERE room_code = %s", (code,))
            if cur.fetchone() is None:
                return code


def _are_friends(conn, user_id_a: int, user_id_b: int) -> bool:
    """Return True if the two users have an ACCEPTED friendship."""
    sql = """
        SELECT id FROM friends
        WHERE status = 'ACCEPTED'
          AND ((requester_id = %s AND addressee_id = %s)
            OR (requester_id = %s AND addressee_id = %s))
        LIMIT 1
    """
    with conn.cursor() as cur:
        cur.execute(sql, (user_id_a, user_id_b, user_id_b, user_id_a))
        return cur.fetchone() is not None


def create_room(conn, host_user_id: int) -> Tuple[bool, Any]:
    """
    Create a new WAITING room and add the host as first participant.
    Returns (True, room_code) or (False, error_msg).
    """
    code = _generate_room_code(conn)

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO multiplayer_rooms (room_code, host_user_id) VALUES (%s, %s)",
            (code, host_user_id),
        )
        room_id = cur.lastrowid
        cur.execute(
            "INSERT INTO room_participants (room_id, user_id) VALUES (%s, %s)",
            (room_id, host_user_id),
        )
    conn.commit()
    return (True, code)


def join_room(conn, room_code: str, user_id: int) -> Tuple[bool, str]:
    """
    Add a user to a WAITING room.
    User must be friends with the host.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, host_user_id, status FROM multiplayer_rooms WHERE room_code = %s",
            (room_code,),
        )
        room = cur.fetchone()

    if room is None:
        return (False, "Room not found")
    if room["status"] != "WAITING":
        return (False, "Room is no longer accepting players")
    if user_id == room["host_user_id"]:
        return (False, "You are the host of this room")
    if not _are_friends(conn, user_id, room["host_user_id"]):
        return (False, "You must be friends with the host to join")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM room_participants WHERE room_id = %s AND user_id = %s",
            (room["id"], user_id),
        )
        if cur.fetchone() is not None:
            return (False, "You are already in this room")

        cur.execute(
            "INSERT INTO room_participants (room_id, user_id) VALUES (%s, %s)",
            (room["id"], user_id),
        )
    conn.commit()
    return (True, "Joined room")


def get_room_status(conn, room_code: str) -> Tuple[bool, Any]:
    """
    Return current room state and all participants with scores.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, room_code, status, board_layout,
                   duration_seconds, started_at, host_user_id
            FROM multiplayer_rooms
            WHERE room_code = %s
            """,
            (room_code,),
        )
        room = cur.fetchone()

    if room is None:
        return (False, "Room not found")

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT rp.user_id, u.username, rp.score, rp.has_submitted
            FROM room_participants rp
            JOIN users u ON u.user_id = rp.user_id
            WHERE rp.room_id = %s
            ORDER BY rp.score DESC
            """,
            (room["id"],),
        )
        participants = cur.fetchall()

    return (True, {
        "room_code": room["room_code"],
        "status": room["status"],
        "host_user_id": room["host_user_id"],
        "duration_seconds": room["duration_seconds"],
        "started_at": str(room["started_at"]) if room["started_at"] else None,
        "board_layout": room["board_layout"],
        "participants": [
            {
                "user_id": p["user_id"],
                "username": p["username"],
                "score": p["score"],
                "has_submitted": bool(p["has_submitted"]),
            }
            for p in participants
        ],
    })


def start_room(conn, room_code: str, host_user_id: int) -> Tuple[bool, Any]:
    """
    Start a WAITING room. Only the host can do this.
    Fetches a shared board from the Java game service.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, host_user_id, status FROM multiplayer_rooms WHERE room_code = %s",
            (room_code,),
        )
        room = cur.fetchone()

    if room is None:
        return (False, "Room not found")
    if room["host_user_id"] != host_user_id:
        return (False, "Only the host can start the game")
    if room["status"] != "WAITING":
        return (False, "Room is not in WAITING state")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM room_participants WHERE room_id = %s",
            (room["id"],),
        )
        count = cur.fetchone()["cnt"]

    if count < 2:
        return (False, "Need at least 2 players to start")

    # Fetch shared board from Java game service
    try:
        resp = requests.post(f"{GAME_SERVICE_URL}/api/games", timeout=5)
        resp.raise_for_status()
        game_data = resp.json()
    except requests.RequestException as e:
        logger.error("Game service error: %s", e)
        return (False, "Game service unavailable")

    board_layout = game_data.get("board")
    game_id = game_data.get("gameId")

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE multiplayer_rooms
            SET status = 'ACTIVE',
                board_layout = %s,
                game_id = %s,
                started_at = NOW()
            WHERE id = %s
            """,
            (str(board_layout), game_id, room["id"]),
        )
    conn.commit()

    return (True, {
        "room_code": room_code,
        "status": "ACTIVE",
        "board": board_layout,
        "game_id": game_id,
    })


def submit_score(conn, room_code: str, user_id: int, score: int, found_words: list) -> Tuple[bool, str]:
    """
    Submit final score and words. Closes room when all players have submitted.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, status FROM multiplayer_rooms WHERE room_code = %s",
            (room_code,),
        )
        room = cur.fetchone()

    if room is None:
        return (False, "Room not found")
    if room["status"] != "ACTIVE":
        return (False, "Game is not active")

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE room_participants
            SET score = %s, found_words = %s, has_submitted = TRUE
            WHERE room_id = %s AND user_id = %s
            """,
            (",".join(found_words) if found_words else "", score, room["id"], user_id),
        )
        if cur.rowcount == 0:
            return (False, "You are not a participant in this room")

    # If everyone has submitted, mark room finished
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) AS total, SUM(has_submitted) AS submitted
            FROM room_participants
            WHERE room_id = %s
            """,
            (room["id"],),
        )
        counts = cur.fetchone()

    if counts["total"] == counts["submitted"]:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE multiplayer_rooms SET status='FINISHED', finished_at=NOW() WHERE id=%s",
                (room["id"],),
            )

    conn.commit()
    return (True, "Score submitted")