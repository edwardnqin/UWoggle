import os
from database import db
from flask import Flask
from dotenv import load_dotenv

# Load .env variables before anything else
load_dotenv()


def create_app():
    app = Flask(__name__)

    # --- Config ---
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # --- Initialize extensions ---
    db.init_app(app)

    # --- Register blueprints (routes) ---
    from routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp)

    # --- Create database tables if they don't exist ---
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
