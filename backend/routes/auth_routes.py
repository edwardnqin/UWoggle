"""
Authentication routes for UWoggle.

Endpoints:
  POST /api/users       — Register a new user (sends verification email)
  POST /api/login       — Log in (requires verified email)
  POST /api/logout      — Log out (clears JWT cookie)
  GET  /api/verify      — Verify email from link (?token=...)
  POST /api/resend-verification — Resend verification email
"""

import logging

from flask import Blueprint, request, jsonify, make_response
from services.email_service import send_verification_email
from services.token_service import generate_verification_token, verify_verification_token
from services.user_service import (
    create_user,
    get_user_by_email,
    get_user_by_username,
    mark_email_verified,
    check_password,
)
from services.auth_service import create_jwt, set_jwt_cookie, get_current_user_from_request

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/api")


# ---------------------------------------------------------------------------
# POST /api/users  —  Register
# ---------------------------------------------------------------------------
@auth_bp.route("/users", methods=["POST"])
def register():
    """
    Register a new user account.

    Body (JSON):
      username  str  required
      email     str  required
      password  str  required  (min 8 chars)

    Returns 201 on success. The user must verify their email before logging in.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON", "status": 400}), 400

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # --- Validation ---
    errors = {}
    if not username:
        errors["username"] = "Username is required"
    elif len(username) < 3 or len(username) > 30:
        errors["username"] = "Username must be 3–30 characters"

    if not email or "@" not in email:
        errors["email"] = "A valid email address is required"

    if len(password) < 8:
        errors["password"] = "Password must be at least 8 characters"

    if errors:
        return jsonify({"error": "Validation failed", "fields": errors, "status": 422}), 422

    # --- Uniqueness checks ---
    if get_user_by_email(email):
        return jsonify({"error": "An account with that email already exists", "status": 409}), 409

    if get_user_by_username(username):
        return jsonify({"error": "That username is already taken", "status": 409}), 409

    # --- Create user (is_verified=False by default) ---
    user = create_user(username=username, email=email, password=password)

    # --- Send verification email ---
    token = generate_verification_token(email)
    email_sent = send_verification_email(
        username=user.username,
        to_email=user.email,
        token=token,
    )

    if not email_sent:
        # Non-fatal: account created, but warn the client
        logger.error("Failed to send verification email to %s", email)
        return jsonify({
            "message": (
                "Account created, but we could not send a verification email. "
                "Please use 'Resend Verification' from the login page."
            ),
            "status": 201,
        }), 201

    return jsonify({
        "message": (
            f"Account created! A verification email has been sent to {email}. "
            "Please check your inbox (and spam folder) to activate your account."
        ),
        "status": 201,
    }), 201


# ---------------------------------------------------------------------------
# GET /api/verify  —  Verify email
# ---------------------------------------------------------------------------
@auth_bp.route("/verify", methods=["GET"])
def verify_email():
    """
    Confirm a user's email address using the token from the verification link.

    Query params:
      token  str  required

    Returns 200 on success, 400/410 on invalid/expired token.
    """
    token = request.args.get("token", "").strip()
    if not token:
        return jsonify({"error": "Verification token is missing", "status": 400}), 400

    email = verify_verification_token(token)
    if email is None:
        return jsonify({
            "error": (
                "This verification link is invalid or has expired. "
                "Please request a new one."
            ),
            "status": 410,
        }), 410

    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "No account found for this token", "status": 404}), 404

    if user.is_verified:
        return jsonify({"message": "Your email is already verified. You can log in.", "status": 200}), 200

    mark_email_verified(user)
    logger.info("Email verified for user %s", user.username)

    return jsonify({"message": "Email verified successfully! You can now log in.", "status": 200}), 200


# ---------------------------------------------------------------------------
# POST /api/resend-verification
# ---------------------------------------------------------------------------
@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    """
    Resend a verification email to an unverified account.

    Body (JSON):
      email  str  required

    Always returns 200 to prevent email enumeration.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required", "status": 400}), 400

    # Respond 200 regardless of whether the email exists (prevents enumeration)
    user = get_user_by_email(email)
    if user and not user.is_verified:
        token = generate_verification_token(email)
        send_verification_email(
            username=user.username,
            to_email=user.email,
            token=token,
        )

    return jsonify({
        "message": (
            "If that email is registered and unverified, "
            "a new verification link has been sent."
        ),
        "status": 200,
    }), 200


# ---------------------------------------------------------------------------
# POST /api/login
# ---------------------------------------------------------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user and issue a JWT stored in an HTTP-only cookie.

    Body (JSON):
      email     str  required
      password  str  required

    Returns 200 with user info on success.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required", "status": 400}), 400

    user = get_user_by_email(email)

    if not user or not check_password(user, password):
        return jsonify({"error": "Invalid email or password", "status": 401}), 401

    if not user.is_verified:
        return jsonify({
            "error": (
                "Your email address has not been verified. "
                "Please check your inbox or request a new verification link."
            ),
            "resend_available": True,
            "status": 403,
        }), 403

    token = create_jwt(user)
    response = make_response(jsonify({
        "message": "Login successful",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "high_score": user.high_score,
            "number_of_games_played": user.number_of_games_played,
        },
        "status": 200,
    }))
    set_jwt_cookie(response, token)
    return response, 200

# ---------------------------------------------------------------------------
# GET /api/me
# ---------------------------------------------------------------------------
@auth_bp.route("/me", methods=["GET"])
def me():
    """
    Return the currently authenticated user based on the JWT cookie.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated", "status": 401}), 401

    return jsonify({
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "high_score": user.high_score,
            "number_of_games_played": user.number_of_games_played,
        },
        "status": 200,
    }), 200

# ---------------------------------------------------------------------------
# POST /api/logout
# ---------------------------------------------------------------------------
@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Clear the JWT cookie to log the user out."""
    response = make_response(jsonify({"message": "Logged out successfully", "status": 200}))
    clear_jwt_cookie(response)
    return response, 200


# ---------------------------------------------------------------------------
# GET /api/me
# ---------------------------------------------------------------------------
@auth_bp.route("/me", methods=["GET"])
def me():
    """Return the currently authenticated user from the JWT cookie."""
    user = get_current_user_from_request()
    if not user:
        return jsonify({"user": None, "status": 200}), 200

    return jsonify({
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "high_score": user.high_score,
            "number_of_games_played": user.number_of_games_played,
        },
        "status": 200,
    }), 200


