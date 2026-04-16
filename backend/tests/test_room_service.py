"""
Unit tests for room_service.py
Run with: pytest backend/tests/test_room_service.py -v
"""

from unittest.mock import MagicMock, patch


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


def test_create_room_code_is_alphanumeric():
    from services.room_service import create_room

    conn, cur = make_conn(fetchone_returns=[None])
    ok, code = create_room(conn, host_user_id=1)

    assert ok is True
    assert code.isalnum()
    assert code == code.upper()


def test_create_room_retries_on_duplicate_code():
    from services.room_service import create_room

    # First fetchone returns a row (code taken), second returns None (code free)
    conn, cur = make_conn(fetchone_returns=[
        {"id": 99},  # code already taken
        None,        # new code is free
    ])
    ok, code = create_room(conn, host_user_id=1)

    assert ok is True
    assert len(code) == 6


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


def test_join_room_host_cannot_join_own_room():
    from services.room_service import join_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"}
    ])
    ok, msg = join_room(conn, "ABCD12", user_id=1)

    assert ok is False
    assert "host" in msg.lower()


def test_join_room_not_friends():
    from services.room_service import join_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"},
        None,  # _are_friends returns None → not friends
    ])
    ok, msg = join_room(conn, "ABCD12", user_id=2)

    assert ok is False
    assert "friends" in msg.lower()


def test_join_room_already_in_room():
    from services.room_service import join_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"},
        {"id": 5},   # _are_friends → friends
        {"id": 3},   # already a participant
    ])
    ok, msg = join_room(conn, "ABCD12", user_id=2)

    assert ok is False
    assert "already" in msg.lower()


def test_join_room_success():
    from services.room_service import join_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"},
        {"id": 5},   # _are_friends → friends
        None,        # not already a participant
    ])
    ok, msg = join_room(conn, "ABCD12", user_id=2)

    assert ok is True
    assert "joined" in msg.lower()
    conn.commit.assert_called_once()


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


def test_get_room_status_has_all_keys():
    from services.room_service import get_room_status

    room_row = {
        "id": 1, "room_code": "ABC123", "status": "ACTIVE",
        "board_layout": "[[A,B],[C,D]]", "duration_seconds": 180,
        "started_at": None, "host_user_id": 1,
    }
    conn, cur = make_conn(fetchone_returns=[room_row])
    cur.fetchall.return_value = []

    ok, data = get_room_status(conn, "ABC123")

    assert ok is True
    for key in ["room_code", "status", "host_user_id", "duration_seconds", "started_at", "board_layout", "participants"]:
        assert key in data


def test_get_room_status_multiple_participants():
    from services.room_service import get_room_status

    room_row = {
        "id": 1, "room_code": "ABC123", "status": "ACTIVE",
        "board_layout": None, "duration_seconds": 120,
        "started_at": None, "host_user_id": 1,
    }
    conn, cur = make_conn(fetchone_returns=[room_row])
    cur.fetchall.return_value = [
        {"user_id": 1, "username": "alice", "score": 50, "has_submitted": True},
        {"user_id": 2, "username": "bob",   "score": 30, "has_submitted": False},
    ]

    ok, data = get_room_status(conn, "ABC123")

    assert ok is True
    assert len(data["participants"]) == 2
    assert data["participants"][0]["username"] == "alice"
    assert data["participants"][1]["has_submitted"] is False


# ── start_room ───────────────────────────────────────────────

def test_start_room_not_found():
    from services.room_service import start_room

    conn, cur = make_conn(fetchone_returns=[None])
    ok, msg = start_room(conn, "ZZZZZZ", host_user_id=1)

    assert ok is False
    assert "not found" in msg.lower()


def test_start_room_not_host():
    from services.room_service import start_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"}
    ])
    ok, msg = start_room(conn, "ABC123", host_user_id=2)  # user 2 is not the host

    assert ok is False
    assert "host" in msg.lower()


def test_start_room_not_waiting():
    from services.room_service import start_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "ACTIVE"}
    ])
    ok, msg = start_room(conn, "ABC123", host_user_id=1)

    assert ok is False
    assert "waiting" in msg.lower()


def test_start_room_not_enough_players():
    from services.room_service import start_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"},
        {"cnt": 1},  # only 1 player
    ])
    ok, msg = start_room(conn, "ABC123", host_user_id=1)

    assert ok is False
    assert "2 players" in msg.lower()


def test_start_room_game_service_unavailable():
    from services.room_service import start_room
    import requests as req

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"},
        {"cnt": 2},
    ])

    with patch("services.room_service.requests.post") as mock_post:
        mock_post.side_effect = req.RequestException("timeout")
        ok, msg = start_room(conn, "ABC123", host_user_id=1)

    assert ok is False
    assert "unavailable" in msg.lower()


def test_start_room_success():
    from services.room_service import start_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"},
        {"cnt": 2},
    ])

    mock_response = MagicMock()
    mock_response.json.return_value = {"board": [["A", "B"], ["C", "D"]], "gameId": 42}

    with patch("services.room_service.requests.post", return_value=mock_response):
        ok, data = start_room(conn, "ABC123", host_user_id=1)

    assert ok is True
    assert data["status"] == "ACTIVE"
    assert data["room_code"] == "ABC123"
    assert data["board"] == [["A", "B"], ["C", "D"]]
    assert data["game_id"] == 42
    conn.commit.assert_called_once()


def test_start_room_updates_status_to_active():
    from services.room_service import start_room

    conn, cur = make_conn(fetchone_returns=[
        {"id": 1, "host_user_id": 1, "status": "WAITING"},
        {"cnt": 3},
    ])

    mock_response = MagicMock()
    mock_response.json.return_value = {"board": [], "gameId": 99}

    with patch("services.room_service.requests.post", return_value=mock_response):
        ok, data = start_room(conn, "ABC123", host_user_id=1)

    assert ok is True
    assert data["status"] == "ACTIVE"


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


def test_submit_score_not_a_participant():
    from services.room_service import submit_score

    conn, cur = make_conn(
        fetchone_returns=[
            {"id": 1, "status": "ACTIVE"},
            {"total": 2, "submitted": 0},  # counts query
        ],
        rowcount=0,  # UPDATE affected 0 rows → not a participant
    )
    ok, msg = submit_score(conn, "ABC123", user_id=99, score=10, found_words=["cat"])

    assert ok is False
    assert "not a participant" in msg.lower()


def test_submit_score_success():
    from services.room_service import submit_score

    conn, cur = make_conn(
        fetchone_returns=[
            {"id": 1, "status": "ACTIVE"},
            {"total": 2, "submitted": 1},  # not everyone has submitted yet
        ],
        rowcount=1,
    )
    ok, msg = submit_score(conn, "ABC123", user_id=1, score=25, found_words=["cat", "bat"])

    assert ok is True
    assert "submitted" in msg.lower()
    conn.commit.assert_called_once()


def test_submit_score_empty_words():
    from services.room_service import submit_score

    conn, cur = make_conn(
        fetchone_returns=[
            {"id": 1, "status": "ACTIVE"},
            {"total": 2, "submitted": 1},
        ],
        rowcount=1,
    )
    ok, msg = submit_score(conn, "ABC123", user_id=1, score=0, found_words=[])

    assert ok is True


def test_submit_score_closes_room_when_all_submitted():
    from services.room_service import submit_score

    conn, cur = make_conn(
        fetchone_returns=[
            {"id": 1, "status": "ACTIVE"},
            {"total": 2, "submitted": 2},  # everyone has now submitted
        ],
        rowcount=1,
    )
    ok, msg = submit_score(conn, "ABC123", user_id=2, score=15, found_words=["dog"])

    assert ok is True
    # The final UPDATE to set status=FINISHED should have been called
    execute_calls = cur.execute.call_args_list
    finished_calls = [c for c in execute_calls if "FINISHED" in str(c)]
    assert len(finished_calls) > 0


def test_submit_score_does_not_close_room_when_not_all_submitted():
    from services.room_service import submit_score

    conn, cur = make_conn(
        fetchone_returns=[
            {"id": 1, "status": "ACTIVE"},
            {"total": 3, "submitted": 1},  # only 1 of 3 submitted
        ],
        rowcount=1,
    )
    ok, msg = submit_score(conn, "ABC123", user_id=1, score=10, found_words=["cat"])

    assert ok is True
    execute_calls = cur.execute.call_args_list
    finished_calls = [c for c in execute_calls if "FINISHED" in str(c)]
    assert len(finished_calls) == 0