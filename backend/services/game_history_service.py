import json
from datetime import datetime, timezone
from models.game_model import Game
from database import db


def _serialize_board(board):
    if not board:
        return "[]"
    return json.dumps(board)


def _deserialize_board(board_layout):
    if not board_layout:
        return []
    try:
        return json.loads(board_layout)
    except (json.JSONDecodeError, TypeError):
        return []


def _serialize_words(words):
    if not words:
        return "[]"
    return json.dumps(words)


def _deserialize_words(words_text):
    if not words_text:
        return []
    try:
        return json.loads(words_text)
    except (json.JSONDecodeError, TypeError):
        return []


def _mode_to_db_value(mode):
    if not mode:
        return "singleplayer"
    lowered = str(mode).strip().lower()
    if lowered == "timed":
        return "timed"
    if lowered == "unlimited":
        return "unlimited"
    return lowered


def _mode_to_display(mode, timer_seconds):
    lowered = (mode or "").lower()
    if lowered == "timed":
        return "Timed"
    if lowered == "unlimited":
        return "Unlimited"
    if timer_seconds and timer_seconds > 0:
        return "Timed"
    return "Unlimited"


def save_game_history(user, payload):
    board = payload.get("board") or []
    found_words = payload.get("foundWords") or []
    score = int(payload.get("score") or 0)
    maxScore = int(payload.get("maxPossibleScore") or 0)
    timer_duration = payload.get("timerDuration")
    timer_seconds = int(timer_duration * 60) if timer_duration else 0
    completed_at = datetime.now(timezone.utc)

    game = Game(
        user_id=user.user_id,
        mode=_mode_to_db_value(payload.get("mode")),
        status="COMPLETED",
        timer_seconds=timer_seconds,
        board_layout=_serialize_board(board),
        max_score=maxScore,
        final_score=score,
        found_words=_serialize_words(found_words),
        completed=True,
        completed_at=completed_at,
        end_reason=payload.get("reason"),
    )
    db.session.add(game)

    user.number_of_games_played = int(user.number_of_games_played or 0) + 1
    if score > int(user.high_score or 0):
        user.high_score = score

    db.session.commit()
    return format_game_record(game)


def format_game_record(game):
    timer_duration = game.timer_seconds // 60 if game.timer_seconds else None
    played_at = game.completed_at or game.created_at
    played_at_text = played_at.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC") if played_at else None
    found_words = _deserialize_words(game.found_words)
    return {
        "id": game.id,
        "playedAt": played_at_text,
        "mode": _mode_to_display(game.mode, game.timer_seconds),
        "timerDuration": timer_duration,
        "score": game.final_score or 0,
        "reason": game.end_reason or ("time_up" if timer_duration else "give_up"),
        "board": _deserialize_board(game.board_layout),
        "foundWords": found_words,
        "wordCount": len(found_words),
    }


def get_game_history_for_user(user):
    games = (
        Game.query.filter_by(user_id=user.user_id, completed=True)
        .order_by(Game.completed_at.desc(), Game.created_at.desc())
        .all()
    )
    return [format_game_record(game) for game in games]
