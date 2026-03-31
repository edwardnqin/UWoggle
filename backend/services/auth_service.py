"""
JWT authentication service for UWoggle.
"""

import os
import jwt
from datetime import datetime, timezone, timedelta
from flask import current_app, request
from services.user_service import get_user_by_id

COOKIE_NAME = "access_token"
TOKEN_MAX_AGE = 7 * 24 * 60 * 60  # 7 days

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
        COOKIE_NAME,
        token,
        httponly=True,
        secure=os.environ.get("FLASK_ENV") == "production",
        samesite="Lax",
        path="/",
    )

def clear_jwt_cookie(response):
    """Clear the auth cookie."""
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        samesite="Lax",
        httponly=True,
        secure=os.environ.get("FLASK_ENV") == "production",
    )


def get_current_user_from_request():
    """Return the authenticated user for the current request, or None."""
    token = request.cookies.get("access_token")
    if not token:
        return None

    try:
        payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
    except jwt.PyJWTError:
        return None

    user_id = payload.get("user_id")
    if not user_id:
        return None

    return get_user_by_id(user_id)
