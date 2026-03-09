from flask import Blueprint, request, jsonify
from database import get_db_connection
from services.friend_service import (
    list_friends, list_requests, send_request, respond_request, remove_friend
)

friends_bp = Blueprint("friends", __name__, url_prefix="/api/friends")

@friends_bp.get("/<int:user_id>")
def get_friends(user_id):
    conn = get_db_connection()
    try:
        friends = list_friends(conn, user_id)
        return jsonify(friends), 200
    finally:
        conn.close()


@friends_bp.get("/<int:user_id>/requests")
def get_requests(user_id):
    conn = get_db_connection()
    try:
        data = list_requests(conn, user_id)
        return jsonify(data), 200
    finally:
        conn.close()


@friends_bp.post("/request")
def post_request():
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
def post_respond(request_id):
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