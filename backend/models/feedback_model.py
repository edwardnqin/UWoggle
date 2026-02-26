from datetime import datetime, timezone

from database import db


class Feedback(db.Model):
    __tablename__ = "feedback"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # If your app later has real auth on the frontend, you can wire this up.
    user_id = db.Column(db.Integer, nullable=True)

    category = db.Column(db.String(30), nullable=False, default="general")
    message = db.Column(db.Text, nullable=False)
    contact = db.Column(db.String(254), nullable=True)
