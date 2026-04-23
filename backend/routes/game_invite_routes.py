"""
Game invite routes: /api/game-invites/*

All mutating routes require an authenticated user (JWT cookie), except where noted.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from database import get_db_connection
from services.auth_service import get_current_user_from_request
from services.game_invite_service import (
    acknowledge_invite_joined,
    create_invite,
    decline_invite,
    list_incoming_pending,
)

game_invites_bp = Blueprint("game_invites", __name__, url_prefix="/api/game-invites")


def _require_user():
    user = get_current_user_from_request()
    if user is None:
        return None, (jsonify({"error": "Unauthorized"}), 401)
    return user.user_id, None


@game_invites_bp.post("")
def post_create_invite():
    """Host registers an invite after creating a multiplayer game in the game service."""
    user_t = _require_user()
    if user_t[1] is not None:
        return user_t[1]
    host_user_id = user_t[0]

    payload = request.get_json(silent=True) or {}
    invitee_raw = payload.get("invitee_user_id")
    game_id_raw = payload.get("game_id")
    join_code = payload.get("join_code")

    if invitee_raw is None or game_id_raw is None or join_code is None:
        return jsonify({"error": "invitee_user_id, game_id, and join_code are required"}), 400

    try:
        invitee_user_id = int(invitee_raw)
        game_id = int(game_id_raw)
    except (TypeError, ValueError):
        return jsonify({"error": "invitee_user_id and game_id must be integers"}), 400

    conn = get_db_connection()
    try:
        ok, msg = create_invite(conn, host_user_id, invitee_user_id, game_id, str(join_code))
        if not ok:
            return jsonify({"error": msg}), 400
        return jsonify({"message": msg}), 201
    finally:
        conn.close()


@game_invites_bp.get("/incoming")
def get_incoming():
    """List PENDING invites for the current user (invitee)."""
    user_t = _require_user()
    if user_t[1] is not None:
        return user_t[1]
    uid = user_t[0]

    conn = get_db_connection()
    try:
        rows = list_incoming_pending(conn, uid)
        return jsonify(rows), 200
    finally:
        conn.close()


@game_invites_bp.post("/<int:invite_id>/decline")
def post_decline(invite_id: int):
    """Invitee declines a pending invite."""
    user_t = _require_user()
    if user_t[1] is not None:
        return user_t[1]
    uid = user_t[0]

    conn = get_db_connection()
    try:
        ok, msg = decline_invite(conn, invite_id, uid)
        if not ok:
            return jsonify({"error": msg}), 400
        return jsonify({"message": msg}), 200
    finally:
        conn.close()


@game_invites_bp.post("/<int:invite_id>/acknowledge")
def post_acknowledge(invite_id: int):
    """Call after successfully joining the game via the game service (marks PENDING -> ACCEPTED)."""
    user_t = _require_user()
    if user_t[1] is not None:
        return user_t[1]
    uid = user_t[0]

    conn = get_db_connection()
    try:
        ok, msg = acknowledge_invite_joined(conn, invite_id, uid)
        if not ok:
            return jsonify({"error": msg}), 400
        return jsonify({"message": msg}), 200
    finally:
        conn.close()
