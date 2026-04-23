"""
game_invite_service.py

Registers in-app multiplayer invites after the host creates a game in the Java game service.
The invitee sees PENDING rows and joins using the same join_code; status is updated after join/decline.

Tables: friend_game_invites, friends (ACCEPTED friendship required), users.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

import pymysql


def _missing_invites_table(exc: BaseException) -> bool:
    """MySQL 1146: table doesn't exist (migration not applied yet)."""
    return (
        isinstance(exc, pymysql.err.ProgrammingError)
        and bool(exc.args)
        and exc.args[0] == 1146
    )


def _are_accepted_friends(conn, user_a: int, user_b: int) -> bool:
    if user_a == user_b:
        return False
    sql = """
          SELECT 1 FROM friends
          WHERE status = 'ACCEPTED'
            AND (
              (requester_id = %(a)s AND addressee_id = %(b)s)
              OR (requester_id = %(b)s AND addressee_id = %(a)s)
            )
          LIMIT 1;
          """
    with conn.cursor() as cur:
        cur.execute(sql, {"a": user_a, "b": user_b})
        return cur.fetchone() is not None


def create_invite(
    conn,
    host_user_id: int,
    invitee_user_id: int,
    game_id: int,
    join_code: str,
) -> Tuple[bool, str]:
    """
    Insert a PENDING invite. Host must be friends (ACCEPTED) with invitee.
    join_code is normalized to uppercase to match the game service.
    """
    if invitee_user_id == host_user_id:
        return (False, "Cannot invite yourself")

    jc = (join_code or "").strip().upper()
    if not jc:
        return (False, "join_code is required")

    if not _are_accepted_friends(conn, host_user_id, invitee_user_id):
        return (False, "You can only invite accepted friends")

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE friend_game_invites
                SET status = 'CANCELLED'
                WHERE host_user_id = %(host)s
                  AND invitee_user_id = %(invitee)s
                  AND status = 'PENDING'
                """,
                {"host": host_user_id, "invitee": invitee_user_id},
            )
            cur.execute(
                """
                INSERT INTO friend_game_invites
                    (host_user_id, invitee_user_id, game_id, join_code, status)
                VALUES (%(host)s, %(invitee)s, %(game_id)s, %(jc)s, 'PENDING')
                """,
                {
                    "host": host_user_id,
                    "invitee": invitee_user_id,
                    "game_id": int(game_id),
                    "jc": jc,
                },
            )
        conn.commit()
        return (True, "Invite created")
    except pymysql.err.ProgrammingError as e:
        if _missing_invites_table(e):
            return (
                False,
                "Game invites are not set up in the database. Run db/migrations/001_add_friend_game_invites.sql against uwoggle.",
            )
        raise
    except pymysql.err.IntegrityError as e:
        if e.args and e.args[0] == 1062:
            return (False, "An invite already exists for this game")
        raise


def list_incoming_pending(conn, invitee_user_id: int) -> List[Dict[str, Any]]:
    """Pending invites where the user is the invitee."""
    sql = """
          SELECT
              i.id AS invite_id,
              i.host_user_id,
              u.username AS host_username,
              i.game_id,
              i.join_code,
              i.status,
              i.created_at
          FROM friend_game_invites i
          JOIN users u ON u.user_id = i.host_user_id
          WHERE i.invitee_user_id = %(uid)s AND i.status = 'PENDING'
          ORDER BY i.created_at DESC;
          """
    try:
        with conn.cursor() as cur:
            cur.execute(sql, {"uid": invitee_user_id})
            rows = cur.fetchall()
    except pymysql.err.ProgrammingError as e:
        if _missing_invites_table(e):
            return []
        raise

    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append(
            {
                "invite_id": r["invite_id"],
                "host_user_id": r["host_user_id"],
                "host_username": r["host_username"],
                "game_id": r["game_id"],
                "join_code": r["join_code"],
                "status": r["status"],
                "created_at": str(r["created_at"]) if r.get("created_at") else None,
            }
        )
    return out


def decline_invite(conn, invite_id: int, invitee_user_id: int) -> Tuple[bool, str]:
    """Invitee declines a pending invite."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE friend_game_invites
                SET status = 'DECLINED'
                WHERE id = %(id)s
                  AND invitee_user_id = %(uid)s
                  AND status = 'PENDING'
                """,
                {"id": invite_id, "uid": invitee_user_id},
            )
            n = cur.rowcount
        conn.commit()
    except pymysql.err.ProgrammingError as e:
        if _missing_invites_table(e):
            return (False, "Game invites table is missing; apply database migration.")
        raise
    if n == 0:
        return (False, "Invite not found or not pending")
    return (True, "Declined")


def acknowledge_invite_joined(conn, invite_id: int, invitee_user_id: int) -> Tuple[bool, str]:
    """
    Mark invite ACCEPTED after the invitee successfully joined the game in the game service.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE friend_game_invites
                SET status = 'ACCEPTED'
                WHERE id = %(id)s
                  AND invitee_user_id = %(uid)s
                  AND status = 'PENDING'
                """,
                {"id": invite_id, "uid": invitee_user_id},
            )
            n = cur.rowcount
        conn.commit()
    except pymysql.err.ProgrammingError as e:
        if _missing_invites_table(e):
            return (False, "Game invites table is missing; apply database migration.")
        raise
    if n == 0:
        return (False, "Invite not found or not pending")
    return (True, "Acknowledged")
