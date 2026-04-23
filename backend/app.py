import os
from database import db, resolve_database_uri
from flask import Flask
from dotenv import load_dotenv

# Load .env variables before anything else (database.py also calls load_dotenv)
load_dotenv()


def create_app():
    app = Flask(__name__)

    # --- Config ---
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-secret-key")
    # Shared with database.get_db_connection() so ORM and raw SQL (friends, rooms) stay in sync.
    app.config["SQLALCHEMY_DATABASE_URI"] = resolve_database_uri()
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
    from routes.game_invite_routes import game_invites_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(board_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(friends_bp)
    app.register_blueprint(room_bp)
    app.register_blueprint(game_history_bp)
    app.register_blueprint(game_invites_bp)

    # --- Create database tables if they don't exist ---
    with app.app_context():
        db.create_all()

        # Reset all online statuses on server start
        from models.user_model import User
        db.session.query(User).update({"is_online": False})
        db.session.commit()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
