from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.db_helper import (
    accept_friend_request,
    get_friend_list,
    reject_friend_request,
    remove_friend,
    send_friend_request,
    get_session,
)


friend_bp = Blueprint("friends", __name__, url_prefix="/friends")


@friend_bp.post("/request")
def request_friend():
    """Send a new friend request.

    Expects a JSON body with ``requester_id`` and ``receiver_id``.  
    On success returns the created request ID.
    """
    data = request.get_json() or {}
    requester_id = data.get("requester_id")
    receiver_id = data.get("receiver_id")
    if requester_id is None or receiver_id is None:
        return jsonify({"error": "requester_id and receiver_id are required"}), 400
    with get_session() as db:
        try:
            req = send_friend_request(db, requester_id=requester_id, receiver_id=receiver_id)
            return jsonify({"id": req.id, "status": req.status.value}), 201
        except ValueError as e:
            return jsonify({"error": str(e)}), 400


@friend_bp.post("/accept")
def accept_friend():
    """Accept a pending friend request.

    Expects a JSON body with ``request_id``.  
    on Success return the updated request information
    """
    data = request.get_json() or {}
    request_id = data.get("request_id")
    if request_id is None:
        return jsonify({"error": "request_id is required"}), 400
    with get_session() as db:
        try:
            req = accept_friend_request(db, request_id=request_id)
            return jsonify({"id": req.id, "status": req.status.value}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400


@friend_bp.post("/reject")
def reject_friend():
    """Reject a pending friend request.

    Expects a JSON body with ``request_id``.
    Returns the updated request information on success.
    """
    data = request.get_json() or {}
    request_id = data.get("request_id")
    if request_id is None:
        return jsonify({"error": "request_id is required"}), 400
    with get_session() as db:
        try:
            req = reject_friend_request(db, request_id=request_id)
            return jsonify({"id": req.id, "status": req.status.value}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400


@friend_bp.delete("/<int:user_id>/<int:friend_id>")
def remove_friendship(user_id: int, friend_id: int):
    """Remove an existing friendship.

    The route uses path parameters for both user IDs.
    204 status on success or 404 if nothing was deleted.
    """
    with get_session() as db:
        deleted = remove_friend(db, requester_id=user_id, receiver_id=friend_id)
        if deleted:
            return "", 204
        return jsonify({"error": "Friendship not found"}), 404


@friend_bp.get("/<int:user_id>")
def list_friends(user_id: int):
    """Retrieve a list of friend IDs for the given user.

    Returns a JSON array of integers.
    """
    with get_session() as db:
        friends = get_friend_list(db, user_id=user_id)
        return jsonify(friends), 200