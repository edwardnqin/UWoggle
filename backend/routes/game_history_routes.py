from flask import Blueprint, jsonify, request
from services.auth_service import get_current_user_from_request
from services.game_history_service import get_game_history_for_user, save_game_history


game_history_bp = Blueprint("game_history", __name__, url_prefix="/api/games")


@game_history_bp.route("/history", methods=["GET"])
def get_history():
    user = get_current_user_from_request()
    if not user:
        return jsonify({"error": "Authentication required", "status": 401}), 401

    records = get_game_history_for_user(user)
    return jsonify({"records": records, "status": 200}), 200


@game_history_bp.route("/history", methods=["POST"])
def create_history_record():
    user = get_current_user_from_request()
    if not user:
        return jsonify({"error": "Authentication required", "status": 401}), 401

    payload = request.get_json(silent=True) or {}
    record = save_game_history(user, payload)
    return jsonify({"record": record, "status": 201}), 201
