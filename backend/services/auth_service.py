"""
JWT authentication service for UWoggle.
"""

import os
import jwt
from datetime import datetime, timezone, timedelta
from flask import current_app


def create_jwt(user) -> str:
    """Create a signed JWT token for the given user."""
    payload = {
        "user_id": user.user_id,
        "username": user.username,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def set_jwt_cookie(response, token: str):
    """Store the JWT in an HTTP-only cookie."""
    response.set_cookie(
        "access_token",
        token,
        httponly=True,
        secure=os.environ.get("FLASK_ENV") == "production",
        samesite="Lax",
        max_age=7 * 24 * 60 * 60,
    )
