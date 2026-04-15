"""
friends_routes.py

Flask routes for Friend System endpoints.

POST /request body uses ``requester_id`` + ``username`` (not tokens). The authenticated user's id
should match ``requester_id`` in a hardened deployment; today the client sends it explicitly.

Endpoints:
- GET    /api/friends/<user_id>              -> list accepted friends (includes is_online)
- GET    /api/friends/<user_id>/requests     -> list pending (incoming/outgoing)
- POST   /api/friends/request                -> send friend request by username
- POST   /api/friends/<request_id>/respond   -> accept/decline request
- DELETE /api/friends/remove                 -> remove accepted friend (JWT cookie; body: friend_id only)

This file should be registered in app.py via:
    app.register_blueprint(friends_bp)
"""

from __future__ import annotations

from flask import Blueprint, request, jsonify
from database import get_db_connection
from services.auth_service import get_current_user_from_request
from services.friend_service import (
    list_friends,
    list_requests,
    send_request_by_username,
    respond_request,
    remove_friend,
)

friends_bp = Blueprint("friends", __name__, url_prefix="/api/friends")


@friends_bp.get("/<int:user_id>")
def get_friends(user_id: int):
    """
    List accepted friends for a user, including their online status.

    Returns:
        200: JSON list of friends [{ user_id, username, is_online }, ...]
    """
    conn = get_db_connection()
    try:
        friends = list_friends(conn, user_id)
        return jsonify(friends), 200
    finally:
        conn.close()


@friends_bp.get("/<int:user_id>/requests")
def get_requests(user_id: int):
    """
    List pending friend requests for a user (incoming + outgoing).

    Returns:
        200: JSON object { incoming: [...], outgoing: [...] }
    """
    conn = get_db_connection()
    try:
        data = list_requests(conn, user_id)
        return jsonify(data), 200
    finally:
        conn.close()


@friends_bp.post("/request")
def post_request():
    """
    Send a friend request to a user by username.

    Expected JSON body:
        {
          "requester_id": <int>,
          "username": <str>
        }

    Returns:
        201: request created successfully
        400: unknown user, self-add, duplicate, etc.
    """
    payload = request.get_json(silent=True) or {}
    requester_id = payload.get("requester_id")
    username = payload.get("username")

    if requester_id is None or username is None or (isinstance(username, str) and not username.strip()):
        return jsonify({"error": "requester_id and username are required"}), 400

    conn = get_db_connection()
    try:
        ok, msg = send_request_by_username(conn, int(requester_id), str(username))
        if not ok:
            return jsonify({"error": msg}), 400
        return jsonify({"message": msg}), 201
    finally:
        conn.close()


@friends_bp.post("/<int:request_id>/respond")
def post_respond(request_id: int):
    """
    Accept or decline a pending friend request.

    Expected JSON body:
        { "action": "ACCEPT" }  or  { "action": "DECLINE" }

    Returns:
        200: action succeeded
        400: invalid action / request not found or not pending
    """
    payload = request.get_json(silent=True) or {}
    action = payload.get("action")

    conn = get_db_connection()
    try:
        ok, msg = respond_request(conn, request_id, action)
        if not ok:
            return jsonify({"error": msg}), 400
        return jsonify({"message": msg}), 200
    finally:
        conn.close()


@friends_bp.delete("/remove")
def delete_friend():
    """
    Remove an accepted friend relationship for the logged-in user.

    Deletes the single ``friends`` row for the pair, so both users stop seeing each other
    on the next list fetch.

    Expected JSON body:
        { "friend_id": <int> }

    Returns:
        200: removed successfully
        401: not logged in
        404: no accepted friendship with that user
        400: missing/invalid friend_id or friend_id equals self
    """
    user = get_current_user_from_request()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    payload = request.get_json(silent=True) or {}
    friend_id = payload.get("friend_id")
    if friend_id is None:
        return jsonify({"error": "friend_id is required"}), 400
    try:
        friend_id = int(friend_id)
    except (TypeError, ValueError):
        return jsonify({"error": "friend_id must be an integer"}), 400

    if friend_id == user.user_id:
        return jsonify({"error": "You cannot remove yourself as a friend"}), 400

    conn = get_db_connection()
    try:
        ok, msg = remove_friend(conn, user.user_id, friend_id)
        if not ok:
            return jsonify({"error": msg}), 404
        return jsonify({"message": msg}), 200
    finally:
        conn.close()
