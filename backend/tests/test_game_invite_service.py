"""
Unit tests for services/game_invite_service.py

Run: pytest backend/tests/test_game_invite_service.py -v
"""

from unittest.mock import MagicMock


def make_conn(rowcount=1, fetchone=None, fetchall=None):
    conn = MagicMock()
    cur = MagicMock()
    cur.__enter__ = MagicMock(return_value=cur)
    cur.__exit__ = MagicMock(return_value=False)
    cur.fetchone.return_value = fetchone
    cur.fetchall.return_value = fetchall or []
    cur.rowcount = rowcount
    conn.cursor.return_value = cur
    return conn, cur


class TestAreAcceptedFriendsUsedInCreate:
    """create_invite calls friendship check via _are_accepted_friends (integration through create)."""

    def test_create_fails_when_not_friends(self):
        from services.game_invite_service import create_invite

        conn, cur = make_conn()
        cur.fetchone.return_value = None  # not friends

        ok, msg = create_invite(conn, 1, 2, 100, "ABC12")
        assert ok is False
        assert "friends" in msg.lower()

    def test_create_fails_self_invite(self):
        from services.game_invite_service import create_invite

        conn, cur = make_conn()
        ok, msg = create_invite(conn, 1, 1, 100, "ABC12")
        assert ok is False
        assert "yourself" in msg.lower()
        cur.execute.assert_not_called()

    def test_create_fails_empty_join_code(self):
        from services.game_invite_service import create_invite

        conn, cur = make_conn()
        cur.fetchone.return_value = {"x": 1}
        ok, msg = create_invite(conn, 1, 2, 100, "  ")
        assert ok is False
        assert "join" in msg.lower()

    def test_create_inserts_when_friends(self):
        import pymysql
        from services.game_invite_service import create_invite

        conn, cur = make_conn()
        cur.fetchone.return_value = {"x": 1}

        ok, msg = create_invite(conn, 1, 2, 42, "xyZ99")
        assert ok is True
        assert "created" in msg.lower() or "invite" in msg.lower()
        insert_calls = [c for c in cur.execute.call_args_list if "INSERT" in str(c)]
        assert insert_calls
        args = insert_calls[0][0][1]
        assert args["jc"] == "XYZ99"

    def test_create_cancels_prior_pending_before_insert(self):
        from services.game_invite_service import create_invite

        conn, cur = make_conn()
        cur.fetchone.return_value = {"x": 1}  # friends

        ok, _ = create_invite(conn, 1, 2, 99, "NEW")
        assert ok is True

        sqls = [str(c[0][0]) if c[0] else "" for c in cur.execute.call_args_list]
        cancel_idx = next(
            (i for i, s in enumerate(sqls) if "UPDATE friend_game_invites" in s and "CANCELLED" in s),
            None,
        )
        insert_idx = next(
            (i for i, s in enumerate(sqls) if "INSERT INTO friend_game_invites" in s),
            None,
        )
        assert cancel_idx is not None, "expected a CANCELLED UPDATE before INSERT"
        assert insert_idx is not None, "expected an INSERT"
        assert cancel_idx < insert_idx, "CANCEL must run before INSERT"

        cancel_args = cur.execute.call_args_list[cancel_idx][0][1]
        assert cancel_args == {"host": 1, "invitee": 2}

    def test_create_duplicate_game_id_integrity(self):
        import pymysql
        from services.game_invite_service import create_invite

        conn, cur = make_conn()
        cur.fetchone.return_value = {"x": 1}

        err = pymysql.err.IntegrityError(1062, "Duplicate")
        # friendship check SELECT, CANCEL UPDATE, then INSERT raises duplicate game_id
        cur.execute.side_effect = [None, None, err]

        ok, msg = create_invite(conn, 1, 2, 42, "ABC")
        assert ok is False
        assert "invite" in msg.lower() or "game" in msg.lower()


class TestListIncoming:
    def test_returns_rows(self):
        from services.game_invite_service import list_incoming_pending

        conn, cur = make_conn(
            fetchall=[
                {
                    "invite_id": 1,
                    "host_user_id": 3,
                    "host_username": "bob",
                    "game_id": 9,
                    "join_code": "ZZZ",
                    "status": "PENDING",
                    "created_at": "2020-01-01 00:00:00",
                }
            ]
        )
        rows = list_incoming_pending(conn, 2)
        assert len(rows) == 1
        assert rows[0]["host_username"] == "bob"
        assert rows[0]["join_code"] == "ZZZ"


class TestDeclineAcknowledge:
    def test_decline_success(self):
        from services.game_invite_service import decline_invite

        conn, cur = make_conn(rowcount=1)
        ok, msg = decline_invite(conn, 5, 2)
        assert ok is True
        conn.commit.assert_called()

    def test_decline_not_found(self):
        from services.game_invite_service import decline_invite

        conn, cur = make_conn(rowcount=0)
        ok, msg = decline_invite(conn, 5, 2)
        assert ok is False

    def test_acknowledge_success(self):
        from services.game_invite_service import acknowledge_invite_joined

        conn, cur = make_conn(rowcount=1)
        ok, msg = acknowledge_invite_joined(conn, 5, 2)
        assert ok is True
