import os
from flask import Flask
from dotenv import load_dotenv

from database import db
from routes.auth_routes import auth_bp
from routes.board_routes import board_bp
from routes.feedback_routes import feedback_bp
from routes.friends_routes import friends_bp

# Load .env variables before anything else
load_dotenv()


def _build_default_mysql_uri() -> str:
    user = os.environ.get("MYSQL_USER") or os.environ.get("MYSQL_USERNAME") or "root"
    password = os.environ.get("MYSQL_PASSWORD") or os.environ.get("MYSQL_ROOT_PASSWORD") or "root"
    host = os.environ.get("MYSQL_HOST", "localhost")
    port = os.environ.get("MYSQL_PORT", "3306")
    database = os.environ.get("MYSQL_DATABASE", "uwoggle")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"


def _resolve_database_uri() -> str:
    explicit = os.environ.get("DATABASE_URL")
    if explicit:
        return explicit
    return _build_default_mysql_uri()


def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = _resolve_database_uri()
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(board_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(friends_bp)

    # Keep this ONLY if your SQLAlchemy models define tables and you want Flask to create them.
    # If you're relying on db/init.sql to create tables, you can comment this out.
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)