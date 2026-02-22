"""
Unit tests for the email verification flow.

Run with: pytest tests/test_email_verification.py -v
"""

import pytest
from unittest.mock import patch, MagicMock
from flask import Flask


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture()
def app():
    """Minimal Flask app for testing."""
    from flask_sqlalchemy import SQLAlchemy

    application = Flask(__name__)
    application.config.update({
        "TESTING": True,
        "SECRET_KEY": "test-secret-key-do-not-use-in-prod",
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    })
    return application


@pytest.fixture()
def app_context(app):
    with app.app_context():
        yield app


# ---------------------------------------------------------------------------
# Token service tests
# ---------------------------------------------------------------------------
class TestTokenService:
    def test_generate_and_verify_token_roundtrip(self, app_context):
        from services.token_service import generate_verification_token, verify_verification_token

        email = "test@example.com"
        token = generate_verification_token(email)

        assert isinstance(token, str)
        assert len(token) > 20

        recovered_email = verify_verification_token(token)
        assert recovered_email == email

    def test_tampered_token_returns_none(self, app_context):
        from services.token_service import verify_verification_token

        result = verify_verification_token("totally.invalid.token")
        assert result is None

    def test_empty_token_returns_none(self, app_context):
        from services.token_service import verify_verification_token

        result = verify_verification_token("")
        assert result is None


# ---------------------------------------------------------------------------
# Email service tests (mocked — no real emails sent)
# ---------------------------------------------------------------------------
class TestEmailService:
    @patch("services.email_service.EMAIL_PROVIDER", "sendgrid")
    @patch("services.email_service._send_via_sendgrid")
    def test_send_verification_email_calls_sendgrid(self, mock_sendgrid, app_context):
        from services.email_service import send_verification_email

        mock_sendgrid.return_value = True
        result = send_verification_email(
            username="testuser",
            to_email="test@example.com",
            token="fake-token",
        )
        assert result is True
        mock_sendgrid.assert_called_once()

    @patch("services.email_service.EMAIL_PROVIDER", "smtp")
    @patch("services.email_service._send_via_smtp")
    def test_send_verification_email_calls_smtp(self, mock_smtp, app_context):
        from services.email_service import send_verification_email

        mock_smtp.return_value = True
        result = send_verification_email(
            username="testuser",
            to_email="test@example.com",
            token="fake-token",
        )
        assert result is True
        mock_smtp.assert_called_once()

    @patch("services.email_service._send_via_sendgrid")
    def test_email_failure_returns_false(self, mock_sendgrid, app_context):
        from services.email_service import send_verification_email

        mock_sendgrid.return_value = False
        result = send_verification_email("user", "fail@example.com", "tok")
        assert result is False


# ---------------------------------------------------------------------------
# Registration endpoint tests
# ---------------------------------------------------------------------------
class TestRegistrationEndpoint:
    @patch("routes.auth_routes.send_verification_email", return_value=True)
    @patch("routes.auth_routes.create_user")
    @patch("routes.auth_routes.get_user_by_username", return_value=None)
    @patch("routes.auth_routes.get_user_by_email", return_value=None)
    def test_register_success(
        self, mock_get_email, mock_get_username, mock_create, mock_send, app
    ):
        from routes.auth_routes import auth_bp

        app.register_blueprint(auth_bp)
        mock_user = MagicMock()
        mock_user.username = "newuser"
        mock_user.email = "new@example.com"
        mock_create.return_value = mock_user

        client = app.test_client()
        response = client.post("/api/users", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "securepassword",
        })

        assert response.status_code == 201
        data = response.get_json()
        assert "verification email" in data["message"].lower()
        mock_send.assert_called_once()

    @patch("routes.auth_routes.get_user_by_email", return_value=MagicMock())
    def test_register_duplicate_email_returns_409(self, mock_get_email, app):
        from routes.auth_routes import auth_bp

        app.register_blueprint(auth_bp)
        client = app.test_client()
        response = client.post("/api/users", json={
            "username": "newuser",
            "email": "taken@example.com",
            "password": "securepassword",
        })
        assert response.status_code == 409

    def test_register_short_password_returns_422(self, app):
        from routes.auth_routes import auth_bp

        app.register_blueprint(auth_bp)
        client = app.test_client()
        response = client.post("/api/users", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "short",
        })
        assert response.status_code == 422

    def test_register_missing_fields_returns_422(self, app):
        from routes.auth_routes import auth_bp

        app.register_blueprint(auth_bp)
        client = app.test_client()
        response = client.post("/api/users", json={"username": "u"})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Verification endpoint tests
# ---------------------------------------------------------------------------
class TestVerifyEndpoint:
    @patch("routes.auth_routes.mark_email_verified")
    @patch("routes.auth_routes.get_user_by_email")
    @patch("routes.auth_routes.verify_verification_token")
    def test_verify_valid_token(self, mock_verify_tok, mock_get_user, mock_mark, app):
        from routes.auth_routes import auth_bp

        app.register_blueprint(auth_bp)
        mock_verify_tok.return_value = "user@example.com"
        mock_user = MagicMock()
        mock_user.is_verified = False
        mock_get_user.return_value = mock_user

        client = app.test_client()
        response = client.get("/api/verify?token=validtoken")
        assert response.status_code == 200
        mock_mark.assert_called_once_with(mock_user)

    @patch("routes.auth_routes.verify_verification_token", return_value=None)
    def test_verify_expired_token_returns_410(self, mock_verify_tok, app):
        from routes.auth_routes import auth_bp

        app.register_blueprint(auth_bp)
        client = app.test_client()
        response = client.get("/api/verify?token=expiredtoken")
        assert response.status_code == 410

    def test_verify_missing_token_returns_400(self, app):
        from routes.auth_routes import auth_bp

        app.register_blueprint(auth_bp)
        client = app.test_client()
        response = client.get("/api/verify")
        assert response.status_code == 400

    @patch("routes.auth_routes.mark_email_verified")
    @patch("routes.auth_routes.get_user_by_email")
    @patch("routes.auth_routes.verify_verification_token")
    def test_verify_already_verified(self, mock_verify_tok, mock_get_user, mock_mark, app):
        from routes.auth_routes import auth_bp

        app.register_blueprint(auth_bp)
        mock_verify_tok.return_value = "user@example.com"
        mock_user = MagicMock()
        mock_user.is_verified = True
        mock_get_user.return_value = mock_user

        client = app.test_client()
        response = client.get("/api/verify?token=validtoken")
        assert response.status_code == 200
        mock_mark.assert_not_called()
