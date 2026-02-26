"""Feedback routes.

Minimal API so players can submit feedback from the homepage.

POST /api/feedback
{"category": "bug"|"suggestion"|"ui"|"other", "message": "...", "contact": "..."}
"""

from flask import Blueprint, jsonify, request

from database import db
from models.feedback_model import Feedback


feedback_bp = Blueprint("feedback", __name__, url_prefix="/api")


@feedback_bp.route("/feedback", methods=["POST"])
def create_feedback():
    payload = request.get_json(silent=True) or {}

    category = (payload.get("category") or "general").strip().lower()
    message = (payload.get("message") or "").strip()
    contact = (payload.get("contact") or "").strip() or None

    if not message:
        return jsonify({"error": "message is required"}), 400
    if len(message) > 2000:
        return jsonify({"error": "message too long (max 2000 chars)"}), 400
    if len(category) > 30:
        category = category[:30]
    if contact and len(contact) > 254:
        contact = contact[:254]

    fb = Feedback(category=category, message=message, contact=contact)
    db.session.add(fb)
    db.session.commit()

    return jsonify({"ok": True, "id": fb.id}), 201
