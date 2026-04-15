"""
Unit tests for services/friend_service.py

Run with:  pytest backend/tests/test_friend_service.py -v
"""

from datetime import datetime
from unittest.mock import MagicMock


# ---------------------------------------------------------------------------
# Helper – build a mock DB connection whose cursor is a context manager
# ---------------------------------------------------------------------------

def make_conn(*fetchone_seq, fetchall=None, rowcount=1):
    conn = MagicMock()
    cur = MagicMock()
    cur.__enter__ = MagicMock(return_value=cur)
    cur.__exit__ = MagicMock(return_value=False)
    cur.fetchone.side_effect = list(fetchone_seq) if fetchone_seq else [None]
    cur.fetchall.return_value = fetchall or []
    cur.rowcount = rowcount
    conn.cursor.return_value = cur
    return conn, cur


# ===========================================================================
# list_friends
# ===========================================================================

class TestListFriends:
    def test_returns_empty_list_when_no_friends(self):
        from services.friend_service import list_friends
        conn, cur = make_conn()
        cur.fetchall.return_value = []
        result = list_friends(conn, user_id=1)
        assert result == []

    def test_returns_friend_list_with_correct_keys(self):
        from services.friend_service import list_friends
        conn, cur = make_conn()
        cur.fetchall.return_value = [
            {"friend_user_id": 2, "friend_username": "bob", "is_online": 1},
            {"friend_user_id": 3, "friend_username": "carol", "is_online": 0},
        ]
        result = list_friends(conn, user_id=1)
        assert len(result) == 2
        assert result[0] == {"user_id": 2, "username": "bob", "is_online": True}
        assert result[1] == {"user_id": 3, "username": "carol", "is_online": False}

    def test_is_online_coerced_to_bool(self):
        from services.friend_service import list_friends
        conn, cur = make_conn()
        cur.fetchall.return_value = [
            {"friend_user_id": 5, "friend_username": "dave", "is_online": 0}
        ]
        result = list_friends(conn, user_id=1)
        assert result[0]["is_online"] is False

    def test_single_friend_returned(self):
        from services.friend_service import list_friends
        conn, cur = make_conn()
        cur.fetchall.return_value = [
            {"friend_user_id": 7, "friend_username": "eve", "is_online": 1}
        ]
        result = list_friends(conn, user_id=1)
        assert len(result) == 1
        assert result[0]["username"] == "eve"


# ===========================================================================
# list_requests
# ===========================================================================

class TestListRequests:
    def test_returns_incoming_and_outgoing_keys(self):
        from services.friend_service import list_requests
        conn, cur = make_conn()
        cur.fetchall.side_effect = [[], []]
        result = list_requests(conn, user_id=1)
        assert "incoming" in result
        assert "outgoing" in result

    def test_incoming_requests_mapped_correctly(self):
        from services.friend_service import list_requests
        conn, cur = make_conn()
        cur.fetchall.side_effect = [
            [{"request_id": 10, "from_user_id": 2, "from_username": "alice",
              "created_at": datetime(2024, 1, 1)}],
            [],
        ]
        result = list_requests(conn, user_id=99)
        assert result["incoming"][0]["from_username"] == "alice"
        assert result["incoming"][0]["request_id"] == 10
        assert result["incoming"][0]["from_user_id"] == 2

    def test_outgoing_requests_mapped_correctly(self):
        from services.friend_service import list_requests
        conn, cur = make_conn()
        cur.fetchall.side_effect = [
            [],
            [{"request_id": 20, "to_user_id": 3, "to_username": "bob",
              "created_at": datetime(2024, 2, 1)}],
        ]
        result = list_requests(conn, user_id=99)
        assert result["outgoing"][0]["to_username"] == "bob"
        assert result["outgoing"][0]["request_id"] == 20

    def test_empty_incoming_and_outgoing(self):
        from services.friend_service import list_requests
        conn, cur = make_conn()
        cur.fetchall.side_effect = [[], []]
        result = list_requests(conn, user_id=1)
        assert result["incoming"] == []
        assert result["outgoing"] == []

    def test_created_at_is_string(self):
        from services.friend_service import list_requests
        conn, cur = make_conn()
        cur.fetchall.side_effect = [
            [{"request_id": 1, "from_user_id": 2, "from_username": "alice",
              "created_at": datetime(2024, 3, 15)}],
            [],
        ]
        result = list_requests(conn, user_id=99)
        assert isinstance(result["incoming"][0]["created_at"], str)


# ===========================================================================
# send_request_by_username
# ===========================================================================

class TestSendRequestByUsername:
    def test_empty_username_returns_false(self):
        from services.friend_service import send_request_by_username
        conn, _ = make_conn()
        ok, msg = send_request_by_username(conn, requester_id=1, username="")
        assert ok is False
        assert "required" in msg.lower()

    def test_whitespace_username_returns_false(self):
        from services.friend_service import send_request_by_username
        conn, _ = make_conn()
        ok, msg = send_request_by_username(conn, requester_id=1, username="   ")
        assert ok is False
        assert "required" in msg.lower()

    def test_unknown_username_returns_false(self):
        from services.friend_service import send_request_by_username
        conn, _ = make_conn(None)
        ok, msg = send_request_by_username(conn, requester_id=1, username="ghost")
        assert ok is False
        assert "no user" in msg.lower()

    def test_self_request_returns_false(self):
        from services.friend_service import send_request_by_username
        conn, _ = make_conn({"user_id": 1})
        ok, msg = send_request_by_username(conn, requester_id=1, username="myself")
        assert ok is False
        assert "yourself" in msg.lower()

    def test_existing_relationship_returns_false(self):
        from services.friend_service import send_request_by_username
        conn, _ = make_conn(
            {"user_id": 2},
            {"id": 5, "status": "ACCEPTED"},
        )
        ok, msg = send_request_by_username(conn, requester_id=1, username="bob")
        assert ok is False
        assert "already exists" in msg.lower()

    def test_successful_request(self):
        from services.friend_service import send_request_by_username
        conn, _ = make_conn(
            {"user_id": 2},
            None,
        )
        ok, msg = send_request_by_username(conn, requester_id=1, username="bob")
        assert ok is True
        assert "sent" in msg.lower()
        conn.commit.assert_called_once()

    def test_case_insensitive_username_lookup(self):
        from services.friend_service import send_request_by_username
        conn, cur = make_conn(
            {"user_id": 2},
            None,
        )
        send_request_by_username(conn, requester_id=1, username="BOB")
        first_call_sql = cur.execute.call_args_list[0][0][0]
        assert "LOWER" in first_call_sql


# ===========================================================================
# respond_request
# ===========================================================================

class TestRespondRequest:
    def test_invalid_action_returns_false(self):
        from services.friend_service import respond_request
        conn, _ = make_conn()
        ok, msg = respond_request(conn, request_id=1, action="MAYBE")
        assert ok is False
        assert "accept or decline" in msg.lower()

    def test_empty_action_returns_false(self):
        from services.friend_service import respond_request
        conn, _ = make_conn()
        ok, msg = respond_request(conn, request_id=1, action="")
        assert ok is False

    def test_accept_not_found_returns_false(self):
        from services.friend_service import respond_request
        conn, cur = make_conn()
        cur.rowcount = 0
        ok, msg = respond_request(conn, request_id=99, action="ACCEPT")
        assert ok is False
        assert "not found" in msg.lower()

    def test_accept_success(self):
        from services.friend_service import respond_request
        conn, cur = make_conn()
        cur.rowcount = 1
        ok, msg = respond_request(conn, request_id=5, action="accept")
        assert ok is True
        assert "accepted" in msg.lower()
        conn.commit.assert_called_once()

    def test_accept_case_insensitive(self):
        from services.friend_service import respond_request
        conn, cur = make_conn()
        cur.rowcount = 1
        ok, _ = respond_request(conn, request_id=5, action="Accept")
        assert ok is True

    def test_decline_not_found_returns_false(self):
        from services.friend_service import respond_request
        conn, cur = make_conn()
        cur.rowcount = 0
        ok, msg = respond_request(conn, request_id=99, action="DECLINE")
        assert ok is False
        assert "not found" in msg.lower()

    def test_decline_success(self):
        from services.friend_service import respond_request
        conn, cur = make_conn()
        cur.rowcount = 1
        ok, msg = respond_request(conn, request_id=5, action="DECLINE")
        assert ok is True
        assert "declined" in msg.lower()
        conn.commit.assert_called_once()

    def test_decline_case_insensitive(self):
        from services.friend_service import respond_request
        conn, cur = make_conn()
        cur.rowcount = 1
        ok, _ = respond_request(conn, request_id=5, action="decline")
        assert ok is True


# ===========================================================================
# remove_friend
# ===========================================================================

class TestRemoveFriend:
    def test_not_found_returns_false(self):
        from services.friend_service import remove_friend
        conn, cur = make_conn()
        cur.rowcount = 0
        ok, msg = remove_friend(conn, user_id=1, friend_id=2)
        assert ok is False
        assert "not found" in msg.lower()

    def test_success_returns_true(self):
        from services.friend_service import remove_friend
        conn, cur = make_conn()
        cur.rowcount = 1
        ok, msg = remove_friend(conn, user_id=1, friend_id=2)
        assert ok is True
        assert "removed" in msg.lower()

    def test_commit_called_on_success(self):
        from services.friend_service import remove_friend
        conn, cur = make_conn()
        cur.rowcount = 1
        remove_friend(conn, user_id=1, friend_id=2)
        conn.commit.assert_called_once()

    def test_works_in_either_direction(self):
        from services.friend_service import remove_friend
        conn, cur = make_conn()
        cur.rowcount = 1
        ok, msg = remove_friend(conn, user_id=2, friend_id=1)
        assert ok is True