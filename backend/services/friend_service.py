"""
friend_service.py

Service-layer functions for the Friend System.

This module contains database logic for:
- Listing accepted friends (with online status)
- Listing incoming/outgoing pending requests
- Generating a temporary friend token
- Sending a friend request via token
- Accepting/declining a friend request
- Removing an accepted friend

These functions are designed to be called by Flask route handlers.
They expect a live DB connection object (e.g., from get_db_connection()).

Tables used:
- users(user_id, username, is_online, ...)
- friends(id, requester_id, addressee_id, status, created_at, responded_at, ...)
- friend_tokens(id, user_id, token, expires_at, created_at)
"""

from __future__ import annotations

import random
import string
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Tuple
import pymysql


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_token(length: int = 6) -> str:
    """Generate a random uppercase alphanumeric token."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


# ---------------------------------------------------------------------------
# List friends
# ---------------------------------------------------------------------------

def list_friends(conn, user_id: int) -> List[Dict[str, Any]]:
    """
    Return all accepted friends for a given user, including their online status.

    Args:
        conn: Active DB connection.
        user_id: The user to list friends for.

    Returns:
        List of dicts: [{ "user_id", "username", "is_online" }, ...]
    """
    sql = """
          SELECT
              CASE
                  WHEN f.requester_id = %(user_id)s THEN u2.user_id
                  ELSE u1.user_id
                  END AS friend_user_id,
              CASE
                  WHEN f.requester_id = %(user_id)s THEN u2.username
                  ELSE u1.username
                  END AS friend_username,
              CASE
                  WHEN f.requester_id = %(user_id)s THEN u2.is_online
                  ELSE u1.is_online
                  END AS is_online
          FROM friends f
                   JOIN users u1 ON u1.user_id = f.requester_id
                   JOIN users u2 ON u2.user_id = f.addressee_id
          WHERE (f.requester_id = %(user_id)s OR f.addressee_id = %(user_id)s)
            AND f.status = 'ACCEPTED';
          """
    with conn.cursor() as cur:
        cur.execute(sql, {"user_id": user_id})
        rows = cur.fetchall()

    return [
        {
            "user_id": r["friend_user_id"],
            "username": r["friend_username"],
            "is_online": bool(r["is_online"]),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# List requests
# ---------------------------------------------------------------------------

def list_requests(conn, user_id: int) -> Dict[str, List[Dict[str, Any]]]:
    """
    Return pending friend requests for a given user:
    - incoming: requests where user_id is the addressee
    - outgoing: requests where user_id is the requester

    Args:
        conn: Active DB connection.
        user_id: User whose pending requests we want.

    Returns:
        Dict with "incoming" and "outgoing" lists.
    """
    incoming_sql = """
                   SELECT f.id AS request_id, u.user_id AS from_user_id, u.username AS from_username, f.created_at
                   FROM friends f
                            JOIN users u ON u.user_id = f.requester_id
                   WHERE f.addressee_id = %(user_id)s AND f.status = 'PENDING';
                   """
    outgoing_sql = """
                   SELECT f.id AS request_id, u.user_id AS to_user_id, u.username AS to_username, f.created_at
                   FROM friends f
                            JOIN users u ON u.user_id = f.addressee_id
                   WHERE f.requester_id = %(user_id)s AND f.status = 'PENDING';
                   """

    with conn.cursor() as cur:
        cur.execute(incoming_sql, {"user_id": user_id})
        incoming = cur.fetchall()
        cur.execute(outgoing_sql, {"user_id": user_id})
        outgoing = cur.fetchall()

    return {
        "incoming": [
            {
                "request_id": r["request_id"],
                "from_user_id": r["from_user_id"],
                "from_username": r["from_username"],
                "created_at": str(r["created_at"]),
            }
            for r in incoming
        ],
        "outgoing": [
            {
                "request_id": r["request_id"],
                "to_user_id": r["to_user_id"],
                "to_username": r["to_username"],
                "created_at": str(r["created_at"]),
            }
            for r in outgoing
        ],
    }


# ---------------------------------------------------------------------------
# Generate friend token
# ---------------------------------------------------------------------------

def generate_friend_token(conn, user_id: int) -> Dict[str, Any]:
    """
    Generate a reusable 6-character friend token for a user, valid for 15 minutes.

    If the user already has a non-expired token, it is replaced with a new one.

    Args:
        conn: Active DB connection.
        user_id: The user generating the token.

    Returns:
        Dict with "token" and "expires_at".
    """
    token = _generate_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    with conn.cursor() as cur:
        # Remove any existing token for this user
        cur.execute("DELETE FROM friend_tokens WHERE user_id = %s", (user_id,))
        # Insert new token
        cur.execute(
            "INSERT INTO friend_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user_id, token, expires_at),
        )
    conn.commit()

    return {
        "token": token,
        "expires_at": expires_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
    }


# ---------------------------------------------------------------------------
# Send friend request by token
# ---------------------------------------------------------------------------

def send_request_by_token(conn, requester_id: int, token: str) -> Tuple[bool, str]:
    """
    Send a friend request using a friend token.

    Looks up who owns the token, validates it is not expired, then creates
    a PENDING friend request from requester_id to the token owner.

    Args:
        conn: Active DB connection.
        requester_id: The user sending the friend request.
        token: The 6-character friend token entered by the requester.

    Returns:
        (ok, message)
    """
    token = token.strip().upper()

    # Look up the token
    with conn.cursor() as cur:
        cur.execute(
            "SELECT user_id, expires_at FROM friend_tokens WHERE token = %s",
            (token,),
        )
        row = cur.fetchone()

    if row is None:
        return (False, "Invalid friend token")

    # Check expiry
    expires_at = row["expires_at"]
    now = datetime.now(timezone.utc)
    # expires_at from MySQL is a naive datetime — make it UTC-aware for comparison
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        return (False, "This friend token has expired")

    addressee_id = row["user_id"]

    if requester_id == addressee_id:
        return (False, "You cannot add yourself as a friend")

    # Detect existing relationship in either direction
    exists_sql = """
                 SELECT id, status FROM friends
                 WHERE (requester_id=%s AND addressee_id=%s)
                    OR (requester_id=%s AND addressee_id=%s)
                 LIMIT 1;
                 """
    with conn.cursor() as cur:
        cur.execute(exists_sql, (requester_id, addressee_id, addressee_id, requester_id))
        existing = cur.fetchone()

    if existing is not None:
        return (False, f"Friend relationship already exists (status={existing['status']})")

    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO friends (requester_id, addressee_id, status) VALUES (%s, %s, 'PENDING')",
                (requester_id, addressee_id),
            )
        conn.commit()
        return (True, "Friend request sent")
    except pymysql.err.IntegrityError:
        return (False, "Friend relationship already exists")


# ---------------------------------------------------------------------------
# Respond to request
# ---------------------------------------------------------------------------

def respond_request(conn, request_id: int, action: str) -> Tuple[bool, str]:
    """
    Respond to a pending friend request.

    Supported actions:
    - "ACCEPT": marks the request as ACCEPTED and sets responded_at
    - "DECLINE": deletes the pending request row

    Args:
        conn: Active DB connection.
        request_id: The friends.id row to respond to.
        action: "ACCEPT" or "DECLINE" (case-insensitive).

    Returns:
        (ok, message)
    """
    action = (action or "").upper()
    if action not in ("ACCEPT", "DECLINE"):
        return (False, "action must be ACCEPT or DECLINE")

    if action == "ACCEPT":
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE friends SET status='ACCEPTED', responded_at=NOW() WHERE id=%s AND status='PENDING'",
                (request_id,),
            )
            updated = cur.rowcount
        conn.commit()
        if updated == 0:
            return (False, "Request not found or not pending")
        return (True, "Request accepted")

    # DECLINE: remove pending request
    with conn.cursor() as cur:
        cur.execute("DELETE FROM friends WHERE id=%s AND status='PENDING'", (request_id,))
        deleted = cur.rowcount
    conn.commit()

    if deleted == 0:
        return (False, "Request not found or not pending")
    return (True, "Request declined")


# ---------------------------------------------------------------------------
# Remove friend
# ---------------------------------------------------------------------------

def remove_friend(conn, user_id: int, friend_id: int) -> Tuple[bool, str]:
    """
    Remove an accepted friend relationship regardless of direction.

    Args:
        conn: Active DB connection.
        user_id: One user.
        friend_id: The other user to unfriend.

    Returns:
        (ok, message)
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM friends
            WHERE status='ACCEPTED'
              AND ((requester_id=%s AND addressee_id=%s)
                OR (requester_id=%s AND addressee_id=%s))
            """,
            (user_id, friend_id, friend_id, user_id),
        )
        deleted = cur.rowcount
    conn.commit()

    if deleted == 0:
        return (False, "Friend relationship not found")
    return (True, "Friend removed")