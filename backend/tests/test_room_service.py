"""
Quick unit tests for room_service.py
Run with: pytest backend/tests/test_room_service.py -v
"""

from unittest.mock import MagicMock


def make_conn(fetchone_returns=None, fetchall_returns=None, rowcount=1):
    """Helper to build a mock DB connection."""
    conn = MagicMock()
    cur = MagicMock()
    cur.__enter__ = MagicMock(return_value=cur)
    cur.__exit__ = MagicMock(return_value=False)
    cur.fetchone.side_effect = fetchone_returns or [None]
    cur.fetchall.return_value = fetchall_returns or []
    cur.rowcount = rowcount
    cur.lastrowid = 1
    conn.cursor.return_value = cur
    return conn, cur


# ── create_room ─────────────────────────────────────────────

def test_create_room_success():
    from services.room_service import create_room

    conn, cur = make_conn(fetchone_returns=[None])  # code not taken
    ok, result = create_room(conn, host_user_id=1)

    assert ok is True
    assert isinstance(result, str)
    assert len(result) == 6
    conn.commit.assert_called_once()


# ── join_room ────────────────────────────────────────────────

def test_join_room_not_found():
    from services.room_service import join_room

    conn, cur = make_conn(fetchone_returns=[None])
    ok, msg = join_room(conn, "ABCD12", user_id=2)

    assert ok is False
    assert "not found" in msg.lower()


def test_join_room_not_waiting():
    from services.room_service import join_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "ACTIVE"}
    ])
    ok, msg = join_room(conn, "ABCD12", user_id=2)

    assert ok is False
    assert "no longer accepting" in msg.lower()


def test_join_room_not_friends():
    from services.room_service import join_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"},
        None,  # _are_friends returns None → not friends
    ])
    ok, msg = join_room(conn, "ABCD12", user_id=2)

    assert ok is False
    assert "friends" in msg.lower()


# ── get_room_status ──────────────────────────────────────────

def test_get_room_status_not_found():
    from services.room_service import get_room_status

    conn, cur = make_conn(fetchone_returns=[None])
    ok, msg = get_room_status(conn, "ZZZZZZ")

    assert ok is False
    assert "not found" in msg.lower()


def test_get_room_status_success():
    from services.room_service import get_room_status

    room_row = {
        "id": 1, "room_code": "ABC123", "status": "WAITING",
        "board_layout": None, "duration_seconds": 120,
        "started_at": None, "host_user_id": 1,
    }
    conn, cur = make_conn(fetchone_returns=[room_row])
    cur.fetchall.return_value = [
        {"user_id": 1, "username": "alice", "score": 0, "has_submitted": False}
    ]

    ok, data = get_room_status(conn, "ABC123")

    assert ok is True
    assert data["room_code"] == "ABC123"
    assert len(data["participants"]) == 1


# ── submit_score ─────────────────────────────────────────────

def test_submit_score_room_not_found():
    from services.room_service import submit_score

    conn, cur = make_conn(fetchone_returns=[None])
    ok, msg = submit_score(conn, "ZZZZZZ", user_id=1, score=10, found_words=["cat"])

    assert ok is False
    assert "not found" in msg.lower()


def test_submit_score_not_active():
    from services.room_service import submit_score

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "status": "WAITING"}
    ])
    ok, msg = submit_score(conn, "ABC123", user_id=1, score=10, found_words=["cat"])

    assert ok is False
    assert "not active" in msg.lower()