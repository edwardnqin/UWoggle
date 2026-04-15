"""Tests for DELETE /api/friends/remove (authenticated remove)."""

from types import SimpleNamespace


class _FakeConn:
    def close(self):
        pass


def test_remove_friend_requires_auth(client):
    resp = client.delete("/api/friends/remove", json={"friend_id": 2})
    assert resp.status_code == 401
    assert resp.get_json()["error"] == "Not authenticated"


def test_remove_friend_requires_friend_id(monkeypatch, client):
    monkeypatch.setattr(
        "routes.friends_routes.get_current_user_from_request",
        lambda: SimpleNamespace(user_id=1),
    )
    resp = client.delete("/api/friends/remove", json={})
    assert resp.status_code == 400
    assert "friend_id" in resp.get_json()["error"].lower()


def test_remove_friend_rejects_self(monkeypatch, client):
    monkeypatch.setattr(
        "routes.friends_routes.get_current_user_from_request",
        lambda: SimpleNamespace(user_id=1),
    )
    resp = client.delete("/api/friends/remove", json={"friend_id": 1})
    assert resp.status_code == 400
    assert "yourself" in resp.get_json()["error"].lower()


def test_remove_friend_calls_service(monkeypatch, client):
    monkeypatch.setattr(
        "routes.friends_routes.get_current_user_from_request",
        lambda: SimpleNamespace(user_id=1),
    )
    monkeypatch.setattr(
        "routes.friends_routes.get_db_connection",
        lambda: _FakeConn(),
    )
    calls = []

    def fake_remove(conn, uid, fid):
        calls.append((uid, fid))
        return (True, "Friend removed")

    monkeypatch.setattr("routes.friends_routes.remove_friend", fake_remove)

    resp = client.delete("/api/friends/remove", json={"friend_id": 42})
    assert resp.status_code == 200
    assert resp.get_json()["message"] == "Friend removed"
    assert calls == [(1, 42)]


def test_remove_friend_not_found(monkeypatch, client):
    monkeypatch.setattr(
        "routes.friends_routes.get_current_user_from_request",
        lambda: SimpleNamespace(user_id=1),
    )
    monkeypatch.setattr(
        "routes.friends_routes.get_db_connection",
        lambda: _FakeConn(),
    )
    monkeypatch.setattr(
        "routes.friends_routes.remove_friend",
        lambda conn, uid, fid: (False, "Friend relationship not found"),
    )
    resp = client.delete("/api/friends/remove", json={"friend_id": 99})
    assert resp.status_code == 404
