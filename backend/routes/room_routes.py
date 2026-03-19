"""
Room routes for multiplayer.

Endpoints:
  POST  /api/rooms                 — create a room
  POST  /api/rooms/<code>/join     — join a room
  GET   /api/rooms/<code>/status   — poll room state + scores
  POST  /api/rooms/<code>/start    — start the game (host only)
  POST  /api/rooms/<code>/submit   — submit final score + words
"""

import jwt
from flask import Blueprint, request, jsonify, current_app
from database import get_db_connection
from services.user_service import get_user_by_id
from services.room_service import (
    create_room,
    join_room,
    get_room_status,
    start_room,
    submit_score,
)

room_bp = Blueprint("rooms", __name__, url_prefix="/api/rooms")


def _get_current_user():
    """Extract verified JWT from cookie, return user or None."""
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        return get_user_by_id(payload["user_id"])
    except jwt.PyJWTError:
        return None


@room_bp.post("")
def create():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    conn = get_db_connection()
    try:
        ok, result = create_room(conn, user.user_id)
        if not ok:
            return jsonify({"error": result}), 400
        return jsonify({"room_code": result}), 201
    finally:
        conn.close()


@room_bp.post("/<string:code>/join")
def join(code):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    conn = get_db_connection()
    try:
        ok, msg = join_room(conn, code.upper(), user.user_id)
        if not ok:
            return jsonify({"error": msg}), 400
        return jsonify({"message": msg}), 200
    finally:
        conn.close()


@room_bp.get("/<string:code>/status")
def status(code):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    conn = get_db_connection()
    try:
        ok, result = get_room_status(conn, code.upper())
        if not ok:
            return jsonify({"error": result}), 404
        return jsonify(result), 200
    finally:
        conn.close()


@room_bp.post("/<string:code>/start")
def start(code):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    conn = get_db_connection()
    try:
        ok, result = start_room(conn, code.upper(), user.user_id)
        if not ok:
            return jsonify({"error": result}), 400
        return jsonify(result), 200
    finally:
        conn.close()


@room_bp.post("/<string:code>/submit")
def submit(code):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    body = request.get_json(silent=True) or {}
    score = body.get("finalScore")
    found_words = body.get("foundWords", [])

    if score is None:
        return jsonify({"error": "finalScore is required"}), 400

    conn = get_db_connection()
    try:
        ok, msg = submit_score(conn, code.upper(), user.user_id, score, found_words)
        if not ok:
            return jsonify({"error": msg}), 400
        return jsonify({"message": msg}), 200
    finally:
        conn.close()