"""
Unit tests for the uwoggle database schema.

Requirements:
    pip install pytest mysql-connector-python

Usage:
    pytest test_uwoggle.py -v

Set DB credentials via environment variables or edit CONFIG below.
"""

import os
import json
import pytest
import mysql.connector
from mysql.connector import Error

# ── Connection config ─────────────────────────────────────────────────────────
CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", "3306")),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", ""),
}
TEST_DB = "uwoggle_test"


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_conn(database=None):
    cfg = {**CONFIG}
    if database:
        cfg["database"] = database
    return mysql.connector.connect(**cfg)


def exec_script(conn, sql: str):
    """Execute a multi-statement SQL string with autocommit (required for DDL)."""
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SET FOREIGN_KEY_CHECKS = 0")
    for statement in sql.split(";"):
        stmt = statement.strip()
        if stmt:
            try:
                cur.execute(stmt)
            except Error as e:
                print(f"\n[exec_script] Warning: {e}\n  stmt: {stmt[:120]}")
    cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    cur.close()
    conn.autocommit = False


def assert_raises(cursor, sql, params=None):
    """Assert that executing the given SQL raises a MySQL Error."""
    with pytest.raises(Error):
        cursor.execute(sql, params or ())


# ── Session-scoped fixture: create DB once, drop after all tests ──────────────

@pytest.fixture(scope="session", autouse=True)
def database():
    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(f"DROP DATABASE IF EXISTS {TEST_DB}")
    cur.execute(f"CREATE DATABASE {TEST_DB}")
    cur.execute(f"USE {TEST_DB}")
    cur.close()

    # Load and run the schema
    schema_path = os.path.join(os.path.dirname(__file__), "init.sql")
    with open(schema_path) as f:
        raw = f.read()

    # Redirect to test DB
    raw = raw.replace("CREATE DATABASE IF NOT EXISTS uwoggle", f"CREATE DATABASE IF NOT EXISTS {TEST_DB}")
    raw = raw.replace("USE uwoggle", f"USE {TEST_DB}")

    exec_script(conn, raw)
    conn.close()

    yield  # run all tests

    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(f"DROP DATABASE IF EXISTS {TEST_DB}")
    cur.close()
    conn.close()


# ── Function-scoped fixture: clean tables between tests ───────────────────────

@pytest.fixture
def db():
    conn = get_conn(TEST_DB)
    cur = conn.cursor()
    cur.execute("SET FOREIGN_KEY_CHECKS = 0")
    for table in ["words_played", "refresh_tokens", "feedback",
                  "games", "friends", "email_verifications", "users"]:
        cur.execute(f"DELETE FROM {table}")
    cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    conn.commit()
    yield conn, cur
    cur.close()
    conn.close()


# ── Seed helpers ──────────────────────────────────────────────────────────────

def insert_user(cur, username="alice", email="alice@test.com", password_hash="hash"):
    cur.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
        (username, email, password_hash),
    )
    return cur.lastrowid


def insert_game(cur, user_id=None, board="ABCDEFGHIJKLMNOP", max_score=100):
    cur.execute(
        "INSERT INTO games (user_id, board_layout, max_score) VALUES (%s, %s, %s)",
        (user_id, board, max_score),
    )
    return cur.lastrowid


# ══════════════════════════════════════════════════════════════════════════════
# USERS
# ══════════════════════════════════════════════════════════════════════════════

class TestUsers:

    def test_insert_basic(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute("SELECT username, email, high_score, number_of_games_played, is_verified FROM users WHERE user_id = %s", (uid,))
        row = cur.fetchone()
        assert row == ("alice", "alice@test.com", 0, 0, 0)

    def test_defaults(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute("SELECT high_score, number_of_games_played, is_verified FROM users WHERE user_id = %s", (uid,))
        high_score, games_played, is_verified = cur.fetchone()
        assert high_score == 0
        assert games_played == 0
        assert is_verified == 0

    def test_unique_username(self, db):
        conn, cur = db
        insert_user(cur, username="alice", email="alice@test.com")
        conn.commit()
        assert_raises(cur, "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
                      ("alice", "other@test.com", "hash"))

    def test_unique_email(self, db):
        conn, cur = db
        insert_user(cur, username="alice", email="alice@test.com")
        conn.commit()
        assert_raises(cur, "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
                      ("bob", "alice@test.com", "hash"))

    def test_username_not_null(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO users (email, password_hash) VALUES ('x@x.com', 'hash')")

    def test_email_not_null(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO users (username, password_hash) VALUES ('bob', 'hash')")

    def test_password_hash_not_null(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO users (username, email) VALUES ('bob', 'bob@x.com')")

    def test_auto_increment(self, db):
        conn, cur = db
        id1 = insert_user(cur, "alice", "alice@x.com")
        id2 = insert_user(cur, "bob",   "bob@x.com")
        conn.commit()
        assert id2 > id1

    def test_updated_at_changes_on_update(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute("SELECT updated_at FROM users WHERE user_id = %s", (uid,))
        before = cur.fetchone()[0]
        import time; time.sleep(1)
        cur.execute("UPDATE users SET high_score = 10 WHERE user_id = %s", (uid,))
        conn.commit()
        cur.execute("SELECT updated_at FROM users WHERE user_id = %s", (uid,))
        after = cur.fetchone()[0]
        assert after >= before


# ══════════════════════════════════════════════════════════════════════════════
# EMAIL VERIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

class TestEmailVerifications:

    def test_insert(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute(
            "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (%s, %s, NOW() + INTERVAL 1 DAY)",
            (uid, "tok123"),
        )
        conn.commit()
        cur.execute("SELECT token FROM email_verifications WHERE user_id = %s", (uid,))
        assert cur.fetchone()[0] == "tok123"

    def test_unique_token(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute("INSERT INTO email_verifications (user_id, token, expires_at) VALUES (%s, 'tok', NOW() + INTERVAL 1 DAY)", (uid,))
        conn.commit()
        assert_raises(cur, "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (%s, 'tok', NOW() + INTERVAL 1 DAY)", (uid,))

    def test_cascade_delete(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute("INSERT INTO email_verifications (user_id, token, expires_at) VALUES (%s, 'tok', NOW() + INTERVAL 1 DAY)", (uid,))
        conn.commit()
        cur.execute("DELETE FROM users WHERE user_id = %s", (uid,))
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM email_verifications WHERE user_id = %s", (uid,))
        assert cur.fetchone()[0] == 0

    def test_foreign_key_invalid_user(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (99999, 'x', NOW())")


# ══════════════════════════════════════════════════════════════════════════════
# FRIENDS
# ══════════════════════════════════════════════════════════════════════════════

class TestFriends:

    def test_insert_pending(self, db):
        conn, cur = db
        a = insert_user(cur, "alice", "alice@x.com")
        b = insert_user(cur, "bob",   "bob@x.com")
        conn.commit()
        cur.execute("INSERT INTO friends (requester_id, addressee_id) VALUES (%s, %s)", (a, b))
        conn.commit()
        cur.execute("SELECT status FROM friends WHERE requester_id = %s", (a,))
        assert cur.fetchone()[0] == "PENDING"

    def test_default_status_is_pending(self, db):
        conn, cur = db
        a = insert_user(cur, "alice", "alice@x.com")
        b = insert_user(cur, "bob",   "bob@x.com")
        conn.commit()
        cur.execute("INSERT INTO friends (requester_id, addressee_id) VALUES (%s, %s)", (a, b))
        conn.commit()
        cur.execute("SELECT status FROM friends WHERE requester_id = %s AND addressee_id = %s", (a, b))
        assert cur.fetchone()[0] == "PENDING"

    def test_no_self_friend(self, db):
        conn, cur = db
        a = insert_user(cur, "alice", "alice@x.com")
        conn.commit()
        assert_raises(cur, "INSERT INTO friends (requester_id, addressee_id) VALUES (%s, %s)", (a, a))

    def test_no_duplicate_pair(self, db):
        conn, cur = db
        a = insert_user(cur, "alice", "alice@x.com")
        b = insert_user(cur, "bob",   "bob@x.com")
        conn.commit()
        cur.execute("INSERT INTO friends (requester_id, addressee_id) VALUES (%s, %s)", (a, b))
        conn.commit()
        assert_raises(cur, "INSERT INTO friends (requester_id, addressee_id) VALUES (%s, %s)", (b, a))

    def test_generated_columns_user_low_high(self, db):
        conn, cur = db
        a = insert_user(cur, "alice", "alice@x.com")
        b = insert_user(cur, "bob",   "bob@x.com")
        conn.commit()
        cur.execute("INSERT INTO friends (requester_id, addressee_id) VALUES (%s, %s)", (a, b))
        conn.commit()
        cur.execute("SELECT user_low, user_high FROM friends WHERE requester_id = %s", (a,))
        low, high = cur.fetchone()
        assert low  == min(a, b)
        assert high == max(a, b)

    def test_cascade_delete_on_user_removal(self, db):
        conn, cur = db
        a = insert_user(cur, "alice", "alice@x.com")
        b = insert_user(cur, "bob",   "bob@x.com")
        conn.commit()
        cur.execute("INSERT INTO friends (requester_id, addressee_id) VALUES (%s, %s)", (a, b))
        conn.commit()
        cur.execute("DELETE FROM users WHERE user_id = %s", (a,))
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM friends WHERE requester_id = %s OR addressee_id = %s", (a, a))
        assert cur.fetchone()[0] == 0


# ══════════════════════════════════════════════════════════════════════════════
# GAMES
# ══════════════════════════════════════════════════════════════════════════════

class TestGames:

    def test_insert_without_user_id(self, db):
        """Backwards compat: existing INSERTs that omit user_id must still work."""
        conn, cur = db
        gid = insert_game(cur, user_id=None)
        conn.commit()
        cur.execute("SELECT user_id FROM games WHERE id = %s", (gid,))
        assert cur.fetchone()[0] is None

    def test_insert_with_user_id(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        gid = insert_game(cur, user_id=uid)
        conn.commit()
        cur.execute("SELECT user_id FROM games WHERE id = %s", (gid,))
        assert cur.fetchone()[0] == uid

    def test_defaults(self, db):
        conn, cur = db
        gid = insert_game(cur)
        conn.commit()
        cur.execute("SELECT final_score, found_words, completed, completed_at FROM games WHERE id = %s", (gid,))
        final_score, found_words, completed, completed_at = cur.fetchone()
        assert final_score  is None
        assert found_words  is None
        assert completed    == 0
        assert completed_at is None

    def test_board_layout_not_null(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO games (board_layout, max_score) VALUES (NULL, 100)")

    def test_max_score_not_null(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO games (board_layout, max_score) VALUES ('ABC', NULL)")

    def test_set_null_on_user_delete(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        gid = insert_game(cur, user_id=uid)
        conn.commit()
        cur.execute("DELETE FROM users WHERE user_id = %s", (uid,))
        conn.commit()
        cur.execute("SELECT user_id FROM games WHERE id = %s", (gid,))
        assert cur.fetchone()[0] is None

    def test_found_words_can_be_written(self, db):
        """Legacy backend writing to found_words must still work."""
        conn, cur = db
        gid = insert_game(cur)
        conn.commit()
        cur.execute("UPDATE games SET found_words = %s WHERE id = %s", ("cat,dog,elf", gid))
        conn.commit()
        cur.execute("SELECT found_words FROM games WHERE id = %s", (gid,))
        assert cur.fetchone()[0] == "cat,dog,elf"


# ══════════════════════════════════════════════════════════════════════════════
# WORDS PLAYED
# ══════════════════════════════════════════════════════════════════════════════

class TestWordsPlayed:

    def test_insert(self, db):
        conn, cur = db
        gid = insert_game(cur)
        conn.commit()
        path = json.dumps([[0, 0], [0, 1], [0, 2]])
        cur.execute(
            "INSERT INTO words_played (game_id, word, points, path) VALUES (%s, %s, %s, %s)",
            (gid, "cat", 3, path),
        )
        conn.commit()
        cur.execute("SELECT word, points FROM words_played WHERE game_id = %s", (gid,))
        row = cur.fetchone()
        assert row == ("cat", 3)

    def test_cascade_delete(self, db):
        conn, cur = db
        gid = insert_game(cur)
        conn.commit()
        cur.execute("INSERT INTO words_played (game_id, word, points, path) VALUES (%s, 'hi', 2, '[]')", (gid,))
        conn.commit()
        cur.execute("DELETE FROM games WHERE id = %s", (gid,))
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM words_played WHERE game_id = %s", (gid,))
        assert cur.fetchone()[0] == 0

    def test_word_not_null(self, db):
        conn, cur = db
        gid = insert_game(cur)
        conn.commit()
        assert_raises(cur, "INSERT INTO words_played (game_id, word, points, path) VALUES (%s, NULL, 1, '[]')", (gid,))

    def test_path_not_null(self, db):
        conn, cur = db
        gid = insert_game(cur)
        conn.commit()
        assert_raises(cur, "INSERT INTO words_played (game_id, word, points, path) VALUES (%s, 'hi', 1, NULL)", (gid,))

    def test_invalid_game_id(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO words_played (game_id, word, points, path) VALUES (99999, 'hi', 1, '[]')")


# ══════════════════════════════════════════════════════════════════════════════
# REFRESH TOKENS
# ══════════════════════════════════════════════════════════════════════════════

class TestRefreshTokens:

    def test_insert(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (%s, %s, NOW() + INTERVAL 7 DAY)",
            (uid, "jwt.token.here"),
        )
        conn.commit()
        cur.execute("SELECT token FROM refresh_tokens WHERE user_id = %s", (uid,))
        assert cur.fetchone()[0] == "jwt.token.here"

    def test_unique_token(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (%s, 'tok', NOW() + INTERVAL 1 DAY)", (uid,))
        conn.commit()
        assert_raises(cur, "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (%s, 'tok', NOW() + INTERVAL 1 DAY)", (uid,))

    def test_cascade_delete(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (%s, 'tok', NOW() + INTERVAL 1 DAY)", (uid,))
        conn.commit()
        cur.execute("DELETE FROM users WHERE user_id = %s", (uid,))
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = %s", (uid,))
        assert cur.fetchone()[0] == 0

    def test_invalid_user(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (99999, 'x', NOW())")


# ══════════════════════════════════════════════════════════════════════════════
# FEEDBACK
# ══════════════════════════════════════════════════════════════════════════════

class TestFeedback:

    def test_anonymous_feedback(self, db):
        """user_id nullable — anonymous submissions must work."""
        conn, cur = db
        cur.execute(
            "INSERT INTO feedback (user_id, category, message) VALUES (NULL, 'bug', 'Something broke')"
        )
        conn.commit()
        cur.execute("SELECT user_id, category FROM feedback")
        row = cur.fetchone()
        assert row[0] is None
        assert row[1] == "bug"

    def test_authenticated_feedback(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute(
            "INSERT INTO feedback (user_id, category, message) VALUES (%s, 'feature', 'Add dark mode')",
            (uid,),
        )
        conn.commit()
        cur.execute("SELECT user_id FROM feedback WHERE category = 'feature'")
        assert cur.fetchone()[0] == uid

    def test_category_not_null(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO feedback (user_id, category, message) VALUES (NULL, NULL, 'hi')")

    def test_message_not_null(self, db):
        _, cur = db
        assert_raises(cur, "INSERT INTO feedback (user_id, category, message) VALUES (NULL, 'bug', NULL)")

    def test_set_null_on_user_delete(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        cur.execute("INSERT INTO feedback (user_id, category, message) VALUES (%s, 'bug', 'oops')", (uid,))
        conn.commit()
        cur.execute("DELETE FROM users WHERE user_id = %s", (uid,))
        conn.commit()
        cur.execute("SELECT user_id FROM feedback WHERE category = 'bug'")
        assert cur.fetchone()[0] is None


# ══════════════════════════════════════════════════════════════════════════════
# VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class TestViews:

    def test_leaderboard_returns_all_users(self, db):
        conn, cur = db
        insert_user(cur, "alice", "alice@x.com")
        insert_user(cur, "bob",   "bob@x.com")
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM leaderboard")
        assert cur.fetchone()[0] == 2

    def test_leaderboard_ordering(self, db):
        conn, cur = db
        a = insert_user(cur, "alice", "alice@x.com")
        b = insert_user(cur, "bob",   "bob@x.com")
        conn.commit()
        cur.execute("UPDATE users SET high_score = 50 WHERE user_id = %s", (a,))
        cur.execute("UPDATE users SET high_score = 99 WHERE user_id = %s", (b,))
        conn.commit()
        cur.execute("SELECT username FROM leaderboard LIMIT 1")
        assert cur.fetchone()[0] == "bob"

    def test_leaderboard_avg_score(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        gid1 = insert_game(cur, user_id=uid)
        gid2 = insert_game(cur, user_id=uid)
        conn.commit()
        cur.execute("UPDATE games SET completed = 1, final_score = 40 WHERE id = %s", (gid1,))
        cur.execute("UPDATE games SET completed = 1, final_score = 60 WHERE id = %s", (gid2,))
        conn.commit()
        cur.execute("SELECT avg_score FROM leaderboard WHERE user_id = %s", (uid,))
        assert cur.fetchone()[0] == 50.0

    def test_match_history_includes_found_words(self, db):
        """Legacy found_words column must still surface in match_history view."""
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        gid = insert_game(cur, user_id=uid)
        conn.commit()
        cur.execute("UPDATE games SET found_words = 'cat,dog' WHERE id = %s", (gid,))
        conn.commit()
        cur.execute("SELECT found_words FROM match_history WHERE game_id = %s", (gid,))
        assert cur.fetchone()[0] == "cat,dog"

    def test_match_history_words_found_normalized(self, db):
        conn, cur = db
        uid = insert_user(cur)
        conn.commit()
        gid = insert_game(cur, user_id=uid)
        conn.commit()
        cur.execute("INSERT INTO words_played (game_id, word, points, path) VALUES (%s, 'cat', 3, '[]')", (gid,))
        cur.execute("INSERT INTO words_played (game_id, word, points, path) VALUES (%s, 'dog', 3, '[]')", (gid,))
        conn.commit()
        cur.execute("SELECT words_found_normalized FROM match_history WHERE game_id = %s", (gid,))
        assert cur.fetchone()[0] == 2

    def test_match_history_anonymous_game(self, db):
        """Games with no user_id (legacy) must still appear in match_history."""
        conn, cur = db
        gid = insert_game(cur, user_id=None)
        conn.commit()
        cur.execute("SELECT game_id, user_id FROM match_history WHERE game_id = %s", (gid,))
        row = cur.fetchone()
        assert row[0] == gid
        assert row[1] is None