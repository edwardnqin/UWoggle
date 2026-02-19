from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.user_helper import (
    authenticate_user,
    create_user,
)
from backend.db_helper import get_session


user_bp = Blueprint("users", __name__, url_prefix="/users")


@user_bp.post("")
def register_user():
    """Register a new user.

    Expects a JSON body with ``email`` and ``password``.
    """
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    with get_session() as db:
        try:
            user = create_user(db, email=email, password=password)
            return jsonify({"id": user.id, "email": user.email}), 201
        except ValueError as e:
            # Do not reveal whether the email exists; instead return a generic message
            return jsonify({"error": "Unable to create user"}), 400


@user_bp.post("/login")
def login_user():
    """Authenticate a user and return a success flag.

    Expects a JSON body with ``email`` and ``password``.
    """
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    with get_session() as db:
        user = authenticate_user(db, email=email, password=password)
        if user:
            return jsonify({"success": True, "user_id": user.id}), 200
        return jsonify({"success": False}), 401