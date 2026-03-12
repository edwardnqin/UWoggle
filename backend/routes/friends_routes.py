"""
friends_routes.py

Flask routes for Friend System endpoints.

Endpoints:
- GET    /api/friends/<user_id>              -> list accepted friends
- GET    /api/friends/<user_id>/requests     -> list pending (incoming/outgoing)
- POST   /api/friends/request                -> send friend request
- POST   /api/friends/<request_id>/respond   -> accept/decline request
- DELETE /api/friends/remove                 -> remove accepted friend

This file should be registered in app.py via:
    app.register_blueprint(friends_bp)
"""

from __future__ import annotations

from flask import Blueprint, request, jsonify
from database import get_db_connection
from services.friend_service import (
    list_friends,
    list_requests,
    send_request,
    respond_request,
    remove_friend,
)

friends_bp = Blueprint("friends", __name__, url_prefix="/api/friends")


@friends_bp.get("/<int:user_id>")
def get_friends(user_id: int):
    """
    List accepted friends for a user.

    Returns:
        200: JSON list of friends
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
        200: JSON object {incoming: [...], outgoing: [...]}
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
    Send a friend request.

    Expected JSON body:
        {
          "requester_id": <int>,
          "addressee_id": <int>
        }

    Returns:
        201: if request created
        400: validation errors (missing fields, duplicates, self-friend, etc.)
    """
    payload = request.get_json(silent=True) or {}
    requester_id = payload.get("requester_id")
    addressee_id = payload.get("addressee_id")

    if requester_id is None or addressee_id is None:
        return jsonify({"error": "requester_id and addressee_id are required"}), 400

    conn = get_db_connection()
    try:
        ok, msg = send_request(conn, int(requester_id), int(addressee_id))
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
    Remove an accepted friend relationship.

    Expected JSON body:
        {
          "user_id": <int>,
          "friend_id": <int>
        }

    Returns:
        200: removed successfully
        404: relationship not found
        400: missing fields
    """
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id")
    friend_id = payload.get("friend_id")

    if user_id is None or friend_id is None:
        return jsonify({"error": "user_id and friend_id are required"}), 400

    conn = get_db_connection()
    try:
        ok, msg = remove_friend(conn, int(user_id), int(friend_id))
        if not ok:
            return jsonify({"error": msg}), 404
        return jsonify({"message": msg}), 200
    finally:
        conn.close()