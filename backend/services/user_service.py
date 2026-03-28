"""
User service — business logic for user creation and lookup.

No business logic lives in routes (STYLE.md § 4.1).
"""

import logging
import bcrypt
from datetime import datetime, timezone
from models.user_model import User
from database import db

logger = logging.getLogger(__name__)


def create_user(username: str, email: str, password: str) -> User:
    """
    Create and persist a new user with a hashed password.
    The user starts as unverified (is_verified=False).
    """
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(
        username=username,
        email=email,
        password_hash=password_hash,
        is_verified=False,
    )
    db.session.add(user)
    db.session.commit()
    logger.info("Created new user: %s (%s)", username, email)
    return user


def get_user_by_email(email: str) -> User | None:
    """Fetch a user by email address (case-insensitive)."""
    return User.query.filter_by(email=email.lower()).first()


def get_user_by_username(username: str) -> User | None:
    """Fetch a user by username."""
    return User.query.filter_by(username=username).first()


def mark_email_verified(user: User) -> None:
    """Mark a user's email as verified and persist."""
    user.is_verified = True
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    logger.info("Email verified for user: %s", user.username)


def check_password(user: User, password: str) -> bool:
    """Return True if the provided password matches the stored hash."""
    return bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8"))

def get_user_by_id(user_id: int) -> User | None:
    """Fetch a user by their primary key."""
    return User.query.get(user_id)
