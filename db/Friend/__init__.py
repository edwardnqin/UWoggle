from __future__ import annotations

from flask import Flask

from backend.db_helper import init_db
from backend.routes import friend_bp, user_bp


def create_app() -> Flask:
    app = Flask(__name__)
    init_db()
    app.register_blueprint(friend_bp)
    app.register_blueprint(user_bp)
    return app

__all__ = ["create_app"]