"""Unit tests for friend_service.remove_friend."""

from unittest.mock import MagicMock

import pytest

from services.friend_service import remove_friend


@pytest.fixture
def conn_with_rowcount():
    conn = MagicMock()
    cur = MagicMock()
    cur.rowcount = 1
    cursor_ctx = MagicMock()
    cursor_ctx.__enter__.return_value = cur
    cursor_ctx.__exit__.return_value = False
    conn.cursor.return_value = cursor_ctx
    return conn, cur


def test_remove_friend_success(conn_with_rowcount):
    conn, cur = conn_with_rowcount
    ok, msg = remove_friend(conn, 10, 20)
    assert ok is True
    assert msg == "Friend removed"
    assert conn.commit.called
    cur.execute.assert_called_once()
    args = cur.execute.call_args[0]
    sql = args[0]
    params = args[1]
    assert "DELETE FROM friends" in sql
    assert params == (10, 20, 20, 10)


def test_remove_friend_no_row_deleted():
    conn = MagicMock()
    cur = MagicMock()
    cur.rowcount = 0
    cursor_ctx = MagicMock()
    cursor_ctx.__enter__.return_value = cur
    cursor_ctx.__exit__.return_value = False
    conn.cursor.return_value = cursor_ctx

    ok, msg = remove_friend(conn, 1, 2)
    assert ok is False
    assert "not found" in msg.lower()
