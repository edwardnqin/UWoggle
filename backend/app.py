import os
from database import db
from flask import Flask
from dotenv import load_dotenv

# Load .env variables before anything else
load_dotenv()


def _build_default_mysql_uri() -> str | None:
    """Build a MySQL SQLAlchemy URI from env vars (works with db/docker-compose.yml).

    Expected env vars (with sensible defaults):
      - MYSQL_USER (default: root)
      - MYSQL_PASSWORD (default: root)
      - MYSQL_HOST (default: localhost)
      - MYSQL_PORT (default: 3306)
      - MYSQL_DATABASE (default: uwoggle)
    """
    user = os.environ.get("MYSQL_USER") or os.environ.get("MYSQL_USERNAME") or "root"
    password = os.environ.get("MYSQL_PASSWORD") or os.environ.get("MYSQL_ROOT_PASSWORD") or "root"
    host = os.environ.get("MYSQL_HOST", "localhost")
    port = os.environ.get("MYSQL_PORT", "3306")
    database = os.environ.get("MYSQL_DATABASE", "uwoggle")

    # If nothing was provided, still return a workable local default.
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"


def _resolve_database_uri() -> str:
    """Resolve DB URI in this priority order:
    1) DATABASE_URL (explicit)
    2) Build MySQL URI from MYSQL_* env vars
    3) Fallback to local SQLite file (ONLY for dev convenience)
    """
    explicit = os.environ.get("DATABASE_URL")
    if explicit:
        return explicit

    # Prefer MySQL because the project already includes db/docker-compose.yml
    mysql_uri = _build_default_mysql_uri()
    if mysql_uri:
        return mysql_uri

    # Last resort fallback (dev only)
    return "sqlite:///uwoggle_dev.db"


def create_app():
    app = Flask(__name__)

    # --- Config ---
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = _resolve_database_uri()
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # --- Initialize extensions ---
    db.init_app(app)

    # --- Register blueprints (routes) ---
    from routes.auth_routes import auth_bp
    from routes.board_routes import board_bp
    from routes.feedback_routes import feedback_bp
    from routes.friends_routes import friends_bp
    from routes.room_routes import room_bp
    from routes.game_history_routes import game_history_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(board_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(friends_bp)
    app.register_blueprint(room_bp)
    app.register_blueprint(game_history_bp)

    # --- Create database tables if they don't exist ---
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
