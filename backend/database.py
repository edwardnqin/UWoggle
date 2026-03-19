from flask_sqlalchemy import SQLAlchemy
import pymysql
import pymysql.cursors
import os

db = SQLAlchemy()


def get_db_connection():
    """Raw pymysql connection used by friend_service and room_service."""
    return pymysql.connect(
        host=os.environ.get("MYSQL_HOST", "localhost"),
        port=int(os.environ.get("MYSQL_PORT", 3306)),
        user=os.environ.get("MYSQL_USER", "root"),
        password=os.environ.get("MYSQL_PASSWORD", "root"),
        database=os.environ.get("MYSQL_DATABASE", "uwoggle"),
        cursorclass=pymysql.cursors.DictCursor,
    )