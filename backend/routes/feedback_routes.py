"""Feedback routes.

Players submit feedback from the homepage, and the backend persists it in the
server-side database (MySQL via db/docker-compose.yml, or any DB set by DATABASE_URL).

API:
  POST /api/feedback
    {"category": "bug"|"suggestion"|"ui"|"other", "message": "...", "contact": "..."}
  GET  /api/feedback
    Returns the most recent feedback entries (JSON)

Human-friendly page:
  GET  /api/feedback/view
    Simple HTML table for quick viewing in a browser.

Optional protection (recommended for deployed environments):
  - Set FEEDBACK_ADMIN_TOKEN in the backend environment
  - Then access with ?token=YOUR_TOKEN (or header X-Admin-Token: YOUR_TOKEN)
"""

import os
from flask import Blueprint, jsonify, request, Response

from database import db
from models.feedback_model import Feedback


feedback_bp = Blueprint("feedback", __name__, url_prefix="/api")


def _admin_token_required() -> str | None:
    return os.environ.get("FEEDBACK_ADMIN_TOKEN") or None


def _check_admin_access() -> bool:
    token = _admin_token_required()
    if not token:
        return True  # no token configured → open access (dev friendly)

    provided = (
        (request.args.get("token") or "").strip()
        or (request.headers.get("X-Admin-Token") or "").strip()
        or (request.headers.get("Authorization") or "").replace("Bearer", "").strip()
    )
    return provided == token


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


@feedback_bp.route("/feedback", methods=["GET"])
def list_feedback():
    if not _check_admin_access():
        return jsonify({"error": "unauthorized"}), 401

    limit = request.args.get("limit", "200")
    try:
        limit_i = max(1, min(int(limit), 500))
    except ValueError:
        limit_i = 200

    rows = (
        Feedback.query.order_by(Feedback.id.desc())
        .limit(limit_i)
        .all()
    )

    return jsonify({
        "ok": True,
        "count": len(rows),
        "items": [
            {
                "id": r.id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "category": r.category,
                "message": r.message,
                "contact": r.contact,
                "user_id": r.user_id,
            }
            for r in rows
        ],
    })


@feedback_bp.route("/feedback/view", methods=["GET"])
def view_feedback_html():
    if not _check_admin_access():
        return Response("Unauthorized", status=401, mimetype="text/plain")

    limit = request.args.get("limit", "200")
    try:
        limit_i = max(1, min(int(limit), 500))
    except ValueError:
        limit_i = 200

    rows = (
        Feedback.query.order_by(Feedback.id.desc())
        .limit(limit_i)
        .all()
    )

    # Minimal HTML so teammates can open a URL and read the feedback.
    # No frontend changes required.
    def esc(s: str) -> str:
        return (
            s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;")
        )

    token = _admin_token_required()
    token_hint = ""
    if token:
        token_hint = "<p><b>Admin token enabled.</b> Append <code>?token=...</code> to the URL.</p>"

    rows_html = []
    for r in rows:
        rows_html.append(
            "<tr>"
            f"<td>{r.id}</td>"
            f"<td>{esc(r.created_at.isoformat() if r.created_at else '')}</td>"
            f"<td>{esc(r.category or '')}</td>"
            f"<td style='white-space:pre-wrap'>{esc(r.message or '')}</td>"
            f"<td>{esc(r.contact or '')}</td>"
            "</tr>"
        )

    html = f"""
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>UWoggle Feedback</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 24px; }}
      table {{ border-collapse: collapse; width: 100%; }}
      th, td {{ border: 1px solid #ddd; padding: 8px; vertical-align: top; }}
      th {{ background: #f4f4f4; position: sticky; top: 0; }}
      .hint {{ color: #555; margin-top: 8px; }}
      code {{ background: #f2f2f2; padding: 2px 4px; border-radius: 4px; }}
    </style>
  </head>
  <body>
    <h1>UWoggle Feedback</h1>
    <div class="hint">
      Showing the most recent {len(rows)} entries. Use <code>?limit=50</code> to change.
    </div>
    {token_hint}
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Created</th>
          <th>Category</th>
          <th>Message</th>
          <th>Contact</th>
        </tr>
      </thead>
      <tbody>
        {''.join(rows_html) if rows_html else '<tr><td colspan="5">No feedback yet.</td></tr>'}
      </tbody>
    </table>
  </body>
</html>
"""
    return Response(html, mimetype="text/html")
