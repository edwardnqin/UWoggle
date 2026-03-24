from types import SimpleNamespace

def test_me_returns_current_user_when_authenticated(client, monkeypatch):
    fake_user = SimpleNamespace(
        user_id=1,
        username="milos",
        email="milos@example.com",
        high_score=42,
        number_of_games_played=7,
    )

    monkeypatch.setattr("routes.auth_routes.get_current_user", lambda: fake_user)

    resp = client.get("/api/me")

    assert resp.status_code == 200
    data = resp.get_json()

    assert data["status"] == 200
    assert data["user"]["user_id"] == 1
    assert data["user"]["username"] == "milos"
    assert data["user"]["email"] == "milos@example.com"
    assert data["user"]["high_score"] == 42
    assert data["user"]["number_of_games_played"] == 7


def test_me_returns_401_when_not_authenticated(client, monkeypatch):
    monkeypatch.setattr("routes.auth_routes.get_current_user", lambda: None)

    resp = client.get("/api/me")

    assert resp.status_code == 401
    data = resp.get_json()

    assert data["status"] == 401
    assert data["error"] == "Not authenticated"