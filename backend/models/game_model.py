from datetime import datetime, timezone
from database import db


class Game(db.Model):
    __tablename__ = "games"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    host_user_id = db.Column(db.Integer, nullable=True)
    guest_user_id = db.Column(db.Integer, nullable=True)
    mode = db.Column(db.String(30), nullable=False, default="singleplayer")
    status = db.Column(db.String(30), nullable=False, default="WAITING")
    timer_seconds = db.Column(db.Integer, nullable=False, default=180)
    join_code = db.Column(db.String(20), nullable=True, unique=True)
    board_layout = db.Column(db.String(255), nullable=False, default="")
    max_score = db.Column(db.Integer, nullable=False, default=0)
    final_score = db.Column(db.Integer, nullable=True)
    found_words = db.Column(db.Text, nullable=True)
    host_score = db.Column(db.Integer, nullable=True)
    guest_score = db.Column(db.Integer, nullable=True)
    host_found_words = db.Column(db.Text, nullable=True)
    guest_found_words = db.Column(db.Text, nullable=True)
    winner_user_id = db.Column(db.Integer, nullable=True)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime, nullable=True)
    end_reason = db.Column(db.String(50), nullable=True)
