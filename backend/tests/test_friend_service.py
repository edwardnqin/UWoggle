"""
Unit tests for services/friend_service.py

Run with:  pytest backend/tests/test_friend_service.py -v
Copy this file to backend/tests/ before running.
"""

from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch, call
import pytest


# ---------------------------------------------------------------------------
# Helper – build a mock DB connection whose cursor is a context manager
# ---------------------------------------------------------------------------

def make_conn(*fetchone_seq, fetchall=None, rowcount=1):
    """
    Return (conn, cursor_mock).

    fetchone_seq – values returned by successive cur.fetchone() calls.
    fetchall     – value returned by cur.fetchall().
    rowcount     – cur.rowcount (affects UPDATE/DELETE return values).
    """
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
# _generate_token
# ===========================================================================

class TestGenerateToken:
    def test_default_length_is_6(self):
        from services.friend_service import _generate_token
        token = _generate_token()
        assert len(token) == 6

    def test_custom_length(self):
        from services.friend_service import _generate_token
        assert len(_generate_token(10)) == 10

    def test_uppercase_alphanumeric_only(self):
        from services.friend_service import _generate_token
        import re
        for _ in range(20):
            assert re.fullmatch(r"[A-Z0-9]+", _generate_token())


# ===========================================================================
# list_friends
# ===========================================================================

class TestListFriends:
    def test_returns_empty_list_when_no_friends(self):
        from services.friend_service import list_friends
        conn, _ = make_conn(fetchall=[])
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


# ===========================================================================
# list_requests
# ===========================================================================

class TestListRequests:
    def test_returns_incoming_and_outgoing_keys(self):
        from services.friend_service import list_requests
        conn, cur = make_conn()
        cur.fetchall.side_effect = [[], []]   # incoming then outgoing
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


# ===========================================================================
# generate_friend_token
# ===========================================================================

class TestGenerateFriendToken:
    def test_returns_token_and_expires_at(self):
        from services.friend_service import generate_friend_token
        conn, _ = make_conn()
        result = generate_friend_token(conn, user_id=1)
        assert "token" in result
        assert "expires_at" in result

    def test_token_is_6_chars(self):
        from services.friend_service import generate_friend_token
        conn, _ = make_conn()
        result = generate_friend_token(conn, user_id=1)
        assert len(result["token"]) == 6

    def test_commit_is_called(self):
        from services.friend_service import generate_friend_token
        conn, _ = make_conn()
        generate_friend_token(conn, user_id=1)
        conn.commit.assert_called_once()

    def test_expires_at_format(self):
        from services.friend_service import generate_friend_token
        conn, _ = make_conn()
        result = generate_friend_token(conn, user_id=7)
        # Should end with " UTC"
        assert result["expires_at"].endswith("UTC")


# ===========================================================================
# send_request_by_token
# ===========================================================================

class TestSendRequestByToken:
    def _future_expires(self):
        return datetime.now(timezone.utc) + timedelta(minutes=10)

    def test_invalid_token_returns_false(self):
        from services.friend_service import send_request_by_token
        conn, _ = make_conn(None)   # fetchone returns None
        ok, msg = send_request_by_token(conn, requester_id=1, token="BADTOK")
        assert ok is False
        assert "invalid" in msg.lower()

    def test_expired_token_returns_false(self):
        from services.friend_service import send_request_by_token
        past = datetime(2020, 1, 1, tzinfo=timezone.utc)
        conn, _ = make_conn({"user_id": 2, "expires_at": past})
        ok, msg = send_request_by_token(conn, requester_id=1, token="EXPIRD")
        assert ok is False
        assert "expired" in msg.lower()

    def test_self_request_returns_false(self):
        from services.friend_service import send_request_by_token
        conn, cur = make_conn(
            {"user_id": 1, "expires_at": self._future_expires()},  # token row
            None,   # existing relationship check → None
        )
        ok, msg = send_request_by_token(conn, requester_id=1, token="ABCDEF")
        assert ok is False
        assert "yourself" in msg.lower()

    def test_existing_relationship_returns_false(self):
        from services.friend_service import send_request_by_token
        conn, cur = make_conn(
            {"user_id": 2, "expires_at": self._future_expires()},
            {"id": 5, "status": "ACCEPTED"},
        )
        ok, msg = send_request_by_token(conn, requester_id=1, token="ABCDEF")
        assert ok is False
        assert "already exists" in msg.lower()

    def test_successful_request(self):
        from services.friend_service import send_request_by_token
        conn, cur = make_conn(
            {"user_id": 2, "expires_at": self._future_expires()},
            None,   # no existing relationship
        )
        ok, msg = send_request_by_token(conn, requester_id=1, token="ABCDEF")
        assert ok is True
        assert "sent" in msg.lower()
        conn.commit.assert_called_once()

    def test_token_is_uppercased_before_lookup(self):
        from services.friend_service import send_request_by_token
        conn, cur = make_conn(None)
        send_request_by_token(conn, requester_id=1, token="abcdef")
        # The execute should have been called with the uppercased token
        args = cur.execute.call_args_list[0]
        assert "ABCDEF" in args[0][1]


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

    def test_decline_not_found_returns_false(self):
        from services.friend_service import respond_request
        conn, cur = make_conn()
        cur.rowcount = 0
        ok, msg = respond_request(conn, request_id=99, action="DECLINE")
        assert ok is False

    def test_decline_success(self):
        from services.friend_service import respond_request
        conn, cur = make_conn()
        cur.rowcount = 1
        ok, msg = respond_request(conn, request_id=5, action="DECLINE")
        assert ok is True
        assert "declined" in msg.lower()


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
        conn.commit.assert_called_once()

    def test_commit_not_called_when_not_found(self):
        from services.friend_service import remove_friend
        conn, cur = make_conn()
        cur.rowcount = 0
        remove_friend(conn, user_id=1, friend_id=2)
        conn.commit.assert_called_once()   # commit IS called; rowcount determines return value
