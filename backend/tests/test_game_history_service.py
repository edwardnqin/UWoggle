"""
Unit tests for:
  - services/game_history_service.py
  - services/auth_service.py  (JWT helpers)

Run with:  pytest backend/tests/test_game_history_service.py -v
Copy this file to backend/tests/ before running.
"""

import json
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch


# ===========================================================================
# Fixtures – minimal Flask app + in-memory SQLite so SQLAlchemy is happy
# ===========================================================================

@pytest.fixture(scope="module")
def app():
    import os
    os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

    from app import create_app
    application = create_app()
    application.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "test-secret",
    })
    return application


@pytest.fixture()
def app_ctx(app):
    with app.app_context():
        yield


# ===========================================================================
# _serialize_board / _deserialize_board
# ===========================================================================

class TestBoardSerialisation:
    def test_serialize_none_returns_empty_list_json(self, app_ctx):
        from services.game_history_service import _serialize_board
        assert _serialize_board(None) == "[]"

    def test_serialize_empty_list(self, app_ctx):
        from services.game_history_service import _serialize_board
        assert _serialize_board([]) == "[]"

    def test_serialize_board_produces_json(self, app_ctx):
        from services.game_history_service import _serialize_board
        board = [["A", "B"], ["C", "D"]]
        result = _serialize_board(board)
        assert json.loads(result) == board

    def test_deserialize_none_returns_empty_list(self, app_ctx):
        from services.game_history_service import _deserialize_board
        assert _deserialize_board(None) == []

    def test_deserialize_empty_string(self, app_ctx):
        from services.game_history_service import _deserialize_board
        assert _deserialize_board("") == []

    def test_deserialize_valid_json(self, app_ctx):
        from services.game_history_service import _deserialize_board
        assert _deserialize_board('["A","B"]') == ["A", "B"]

    def test_deserialize_invalid_json_returns_empty_list(self, app_ctx):
        from services.game_history_service import _deserialize_board
        assert _deserialize_board("not-json!!!") == []


# ===========================================================================
# _serialize_words / _deserialize_words
# ===========================================================================

class TestWordSerialisation:
    def test_serialize_none_returns_bracket(self, app_ctx):
        from services.game_history_service import _serialize_words
        assert _serialize_words(None) == "[]"

    def test_serialize_word_list(self, app_ctx):
        from services.game_history_service import _serialize_words
        assert json.loads(_serialize_words(["cat", "dog"])) == ["cat", "dog"]

    def test_deserialize_valid_words(self, app_ctx):
        from services.game_history_service import _deserialize_words
        assert _deserialize_words('["hello","world"]') == ["hello", "world"]

    def test_deserialize_empty_returns_list(self, app_ctx):
        from services.game_history_service import _deserialize_words
        assert _deserialize_words("") == []

    def test_deserialize_bad_json_returns_empty(self, app_ctx):
        from services.game_history_service import _deserialize_words
        assert _deserialize_words("{bad}") == []


# ===========================================================================
# _mode_to_db_value
# ===========================================================================

class TestModeToDbValue:
    def test_none_returns_singleplayer(self, app_ctx):
        from services.game_history_service import _mode_to_db_value
        assert _mode_to_db_value(None) == "singleplayer"

    def test_timed(self, app_ctx):
        from services.game_history_service import _mode_to_db_value
        assert _mode_to_db_value("timed") == "timed"
        assert _mode_to_db_value("TIMED") == "timed"

    def test_unlimited(self, app_ctx):
        from services.game_history_service import _mode_to_db_value
        assert _mode_to_db_value("Unlimited") == "unlimited"

    def test_unknown_passthrough(self, app_ctx):
        from services.game_history_service import _mode_to_db_value
        assert _mode_to_db_value("custom") == "custom"


# ===========================================================================
# _mode_to_display
# ===========================================================================

class TestModeToDisplay:
    def test_timed_mode(self, app_ctx):
        from services.game_history_service import _mode_to_display
        assert _mode_to_display("timed", 180) == "Timed"

    def test_unlimited_mode(self, app_ctx):
        from services.game_history_service import _mode_to_display
        assert _mode_to_display("unlimited", 0) == "Unlimited"

    def test_timer_seconds_positive_implies_timed(self, app_ctx):
        from services.game_history_service import _mode_to_display
        assert _mode_to_display("", 60) == "Timed"

    def test_no_mode_no_timer_is_unlimited(self, app_ctx):
        from services.game_history_service import _mode_to_display
        assert _mode_to_display("", 0) == "Unlimited"


# ===========================================================================
# format_game_record
# ===========================================================================

class TestFormatGameRecord:
    def _make_game(self, **kwargs):
        game = MagicMock()
        game.id = kwargs.get("id", 1)
        game.timer_seconds = kwargs.get("timer_seconds", 180)
        game.completed_at = kwargs.get("completed_at", datetime(2024, 6, 1, 12, 0, tzinfo=timezone.utc))
        game.created_at = kwargs.get("created_at", datetime(2024, 6, 1, 12, 0, tzinfo=timezone.utc))
        game.mode = kwargs.get("mode", "timed")
        game.final_score = kwargs.get("final_score", 42)
        game.end_reason = kwargs.get("end_reason", "time_up")
        game.board_layout = kwargs.get("board_layout", '["A","B"]')
        game.found_words = kwargs.get("found_words", '["cat","bat"]')
        return game

    def test_basic_fields_present(self, app_ctx):
        from services.game_history_service import format_game_record
        game = self._make_game()
        result = format_game_record(game)
        assert "id" in result
        assert "playedAt" in result
        assert "mode" in result
        assert "score" in result
        assert "board" in result
        assert "foundWords" in result
        assert "wordCount" in result

    def test_word_count_matches_found_words(self, app_ctx):
        from services.game_history_service import format_game_record
        game = self._make_game(found_words='["cat","bat","hat"]')
        result = format_game_record(game)
        assert result["wordCount"] == 3

    def test_timer_duration_in_minutes(self, app_ctx):
        from services.game_history_service import format_game_record
        game = self._make_game(timer_seconds=180)
        result = format_game_record(game)
        assert result["timerDuration"] == 3   # 180 // 60

    def test_no_timer_gives_none_duration(self, app_ctx):
        from services.game_history_service import format_game_record
        game = self._make_game(timer_seconds=0)
        result = format_game_record(game)
        assert result["timerDuration"] is None

    def test_score_uses_final_score(self, app_ctx):
        from services.game_history_service import format_game_record
        game = self._make_game(final_score=99)
        result = format_game_record(game)
        assert result["score"] == 99

    def test_played_at_utc_format(self, app_ctx):
        from services.game_history_service import format_game_record
        game = self._make_game()
        result = format_game_record(game)
        assert "UTC" in result["playedAt"]

    def test_default_end_reason_time_up_for_timed(self, app_ctx):
        from services.game_history_service import format_game_record
        game = self._make_game(end_reason=None, timer_seconds=120)
        result = format_game_record(game)
        assert result["reason"] == "time_up"

    def test_default_end_reason_give_up_for_untimed(self, app_ctx):
        from services.game_history_service import format_game_record
        game = self._make_game(end_reason=None, timer_seconds=0)
        result = format_game_record(game)
        assert result["reason"] == "give_up"


# ===========================================================================
# save_game_history  (integration-style – mocks DB session)
# ===========================================================================

class TestSaveGameHistory:
    def _make_user(self, high_score=0, games_played=0):
        user = MagicMock()
        user.user_id = 1
        user.high_score = high_score
        user.number_of_games_played = games_played
        return user

    @patch("services.game_history_service.db")
    def test_increments_games_played(self, mock_db, app_ctx):
        from services.game_history_service import save_game_history
        user = self._make_user(games_played=3)
        save_game_history(user, {"score": 10, "mode": "timed",
                                  "timerDuration": 3, "board": [], "foundWords": []})
        assert user.number_of_games_played == 4

    @patch("services.game_history_service.db")
    def test_updates_high_score_when_beaten(self, mock_db, app_ctx):
        from services.game_history_service import save_game_history
        user = self._make_user(high_score=5)
        save_game_history(user, {"score": 100, "mode": "timed",
                                  "timerDuration": 3, "board": [], "foundWords": []})
        assert user.high_score == 100

    @patch("services.game_history_service.db")
    def test_does_not_lower_high_score(self, mock_db, app_ctx):
        from services.game_history_service import save_game_history
        user = self._make_user(high_score=200)
        save_game_history(user, {"score": 50, "mode": "timed",
                                  "timerDuration": 3, "board": [], "foundWords": []})
        assert user.high_score == 200

    @patch("services.game_history_service.db")
    def test_commit_called(self, mock_db, app_ctx):
        from services.game_history_service import save_game_history
        user = self._make_user()
        save_game_history(user, {"score": 0, "mode": "unlimited",
                                  "board": [], "foundWords": []})
        mock_db.session.commit.assert_called_once()

    @patch("services.game_history_service.db")
    def test_returns_formatted_record(self, mock_db, app_ctx):
        from services.game_history_service import save_game_history
        user = self._make_user()
        result = save_game_history(user, {
            "score": 15,
            "mode": "timed",
            "timerDuration": 2,
            "board": [["A"]],
            "foundWords": ["ax"],
            "reason": "time_up",
        })
        assert "score" in result
        assert result["score"] == 15
        assert result["wordCount"] == 1


# ===========================================================================
# get_game_history_for_user
# ===========================================================================

class TestGetGameHistoryForUser:
    @patch("services.game_history_service.Game")
    def test_returns_list(self, mock_game_cls, app_ctx):
        from services.game_history_service import get_game_history_for_user

        mock_query = MagicMock()
        mock_game_cls.query.filter_by.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = []

        user = MagicMock()
        user.user_id = 1
        result = get_game_history_for_user(user)
        assert result == []

    @patch("services.game_history_service.Game")
    def test_each_game_formatted(self, mock_game_cls, app_ctx):
        from services.game_history_service import get_game_history_for_user

        fake_game = MagicMock()
        fake_game.id = 7
        fake_game.timer_seconds = 120
        fake_game.completed_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
        fake_game.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
        fake_game.mode = "timed"
        fake_game.final_score = 30
        fake_game.end_reason = "time_up"
        fake_game.board_layout = "[]"
        fake_game.found_words = '["word"]'

        mock_query = MagicMock()
        mock_game_cls.query.filter_by.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = [fake_game]

        user = MagicMock()
        user.user_id = 1
        result = get_game_history_for_user(user)
        assert len(result) == 1
        assert result[0]["id"] == 7
        assert result[0]["wordCount"] == 1


# ===========================================================================
# auth_service – JWT helpers
# ===========================================================================

class TestAuthServiceJWT:
    """Test create_jwt / get_current_user_from_request using the Flask test client."""

    @pytest.fixture()
    def client(self, app):
        return app.test_client()

    def test_create_jwt_returns_string(self, app_ctx):
        from services.auth_service import create_jwt

        # Need an app context with SECRET_KEY set
        fake_user = MagicMock()
        fake_user.user_id = 42
        fake_user.username = "tester"

        token = create_jwt(fake_user)
        assert isinstance(token, str)
        # JWT has three dot-separated parts
        assert token.count(".") == 2

    def test_jwt_payload_contains_user_id(self, app_ctx):
        import jwt as pyjwt
        from services.auth_service import create_jwt
        from flask import current_app

        fake_user = MagicMock()
        fake_user.user_id = 99
        fake_user.username = "payload_tester"

        token = create_jwt(fake_user)
        payload = pyjwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        assert payload["user_id"] == 99
        assert payload["username"] == "payload_tester"

    def test_jwt_expires_in_about_7_days(self, app_ctx):
        import jwt as pyjwt
        from services.auth_service import create_jwt
        from flask import current_app

        fake_user = MagicMock()
        fake_user.user_id = 1
        fake_user.username = "expiry_tester"

        token = create_jwt(fake_user)
        payload = pyjwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = exp - now
        # Should be between 6 and 8 days
        assert timedelta(days=6) < delta < timedelta(days=8)

    def test_get_current_user_no_cookie_returns_none(self, client):
        """With no cookie set, get_current_user_from_request should return None."""
        from services.auth_service import get_current_user_from_request

        with client.application.test_request_context("/"):
            result = get_current_user_from_request()
            assert result is None

    def test_get_current_user_bad_token_returns_none(self, client):
        from services.auth_service import get_current_user_from_request

        with client.application.test_request_context("/", headers={"Cookie": "access_token=garbage"}):
            result = get_current_user_from_request()
            assert result is None
