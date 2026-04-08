"""
Database helpers: Flask-SQLAlchemy + raw pymysql for friend/room routes.

Friend / room work (feature: username-based invites + MySQL config unification):
- ``resolve_database_uri()`` is the single source for the DB URL (``DATABASE_URL`` or ``MYSQL_*``).
- ``get_db_connection()`` parses that same URL so pymysql uses identical credentials/host as the ORM
  (avoids 500s when SQLAlchemy used one password and raw pymysql used another).
"""
from __future__ import annotations

import os

import pymysql
import pymysql.cursors
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.engine.url import make_url

load_dotenv()

db = SQLAlchemy()


def _build_default_mysql_uri() -> str:
    """Build a MySQL SQLAlchemy URI from env vars (works with db/docker-compose.yml)."""
    user = os.environ.get("MYSQL_USER") or os.environ.get("MYSQL_USERNAME") or "root"
    password = os.environ.get("MYSQL_PASSWORD") or os.environ.get("MYSQL_ROOT_PASSWORD") or "root"
    host = os.environ.get("MYSQL_HOST", "localhost")
    port = os.environ.get("MYSQL_PORT", "3306")
    database = os.environ.get("MYSQL_DATABASE", "uwoggle")

    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"


def resolve_database_uri() -> str:
    """Same rules as Flask SQLALCHEMY_DATABASE_URI: DATABASE_URL, then MYSQL_*, else SQLite."""
    explicit = os.environ.get("DATABASE_URL")
    if explicit:
        return explicit

    return _build_default_mysql_uri()


def get_db_connection():
    """
    Raw pymysql connection for friend_service and room_service.

    Uses the same URI resolution as SQLAlchemy (including DATABASE_URL) so credentials
    always match the ORM.
    """
    uri = resolve_database_uri()

    if uri.startswith("sqlite"):
        raise RuntimeError(
            "Friends and rooms require MySQL. Set DATABASE_URL to a mysql+pymysql:// URI "
            "or configure MYSQL_HOST / MYSQL_USER / MYSQL_PASSWORD."
        )

    url = make_url(uri)
    if not url.drivername.startswith("mysql"):
        raise RuntimeError(f"Unsupported database URL for raw SQL routes: {url.drivername}")

    return pymysql.connect(
        host=url.host or "localhost",
        port=url.port or 3306,
        user=url.username or "root",
        password=url.password or "",
        database=url.database,
        cursorclass=pymysql.cursors.DictCursor,
    )
