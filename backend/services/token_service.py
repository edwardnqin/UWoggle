"""
Token utilities for email verification.

Generates and validates time-limited, cryptographically signed tokens
using Python's itsdangerous library (already a Flask dependency).
"""

import logging
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask import current_app

logger = logging.getLogger(__name__)

TOKEN_SALT = "email-verification-salt"
TOKEN_MAX_AGE_SECONDS = 86_400  # 24 hours


def generate_verification_token(email: str) -> str:
    """
    Generate a signed, URL-safe token encoding the user's email.

    The token is self-contained — no database storage needed.
    It expires after TOKEN_MAX_AGE_SECONDS (24 hours).

    Args:
        email: The email address to encode into the token.

    Returns:
        A URL-safe string token.
    """
    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    return serializer.dumps(email, salt=TOKEN_SALT)


def verify_verification_token(token: str) -> str | None:
    """
    Validate a verification token and return the encoded email.

    Args:
        token: The token string from the verification link.

    Returns:
        The email address if valid, or None if expired / tampered.
    """
    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    try:
        email = serializer.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE_SECONDS)
        return email
    except SignatureExpired:
        logger.warning("Verification token expired")
        return None
    except BadSignature:
        logger.warning("Invalid verification token received")
        return None
