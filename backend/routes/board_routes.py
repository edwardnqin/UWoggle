"""
Board routes. Proxies to the game service for board generation.
"""

import os
import logging

import requests
from flask import Blueprint, jsonify

logger = logging.getLogger(__name__)
board_bp = Blueprint("board", __name__, url_prefix="/api")

GAME_SERVICE_URL = os.environ.get("GAME_SERVICE_URL", "http://localhost:8080")


@board_bp.route("/board", methods=["GET"])
def get_board():
    """Fetch a new Boggle board from the game service."""
    try:
        resp = requests.get(f"{GAME_SERVICE_URL}/board", timeout=5)
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.RequestException as e:
        logger.error("Game service request failed: %s", e)
        return jsonify({"error": "Board service unavailable"}), 503
