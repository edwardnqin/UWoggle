CREATE DATABASE IF NOT EXISTS uwoggle;
USE uwoggle;

-- Core user table (aligned with backend/models/user_model.py)
CREATE TABLE IF NOT EXISTS users (
    user_id               INT          AUTO_INCREMENT PRIMARY KEY,
    username              VARCHAR(30)  NOT NULL UNIQUE,
    email                 VARCHAR(254) NOT NULL UNIQUE,
    password_hash         VARCHAR(255) NOT NULL,
    high_score            INT          NOT NULL DEFAULT 0,
    number_of_games_played INT         NOT NULL DEFAULT 0,
    is_verified           BOOLEAN      NOT NULL DEFAULT FALSE,
    is_online             BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP
);

-- Temporary token store for email verification
-- Note: token_service.py uses self-contained itsdangerous tokens (no DB row needed),
-- but this table is kept for any future token-persistence strategy.
CREATE TABLE IF NOT EXISTS email_verifications (
    id         INT          AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NOT NULL,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Friend relationships
CREATE TABLE IF NOT EXISTS friends (
    id           INT      AUTO_INCREMENT PRIMARY KEY,
    requester_id INT      NOT NULL,
    addressee_id INT      NOT NULL,
    status       ENUM('PENDING', 'ACCEPTED') NOT NULL DEFAULT 'PENDING',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME NULL,

    CONSTRAINT chk_not_self_friend CHECK (requester_id <> addressee_id),
    FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Enforce one row per pair regardless of direction
ALTER TABLE friends
    ADD COLUMN user_low  INT GENERATED ALWAYS AS (LEAST(requester_id, addressee_id))  STORED,
    ADD COLUMN user_high INT GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
    ADD UNIQUE KEY uq_friend_pair (user_low, user_high);

CREATE INDEX idx_friends_requester ON friends (requester_id, status);
CREATE INDEX idx_friends_addressee ON friends (addressee_id, status);

-- Friend tokens for token-based friend requests (15 min expiry, reusable)
CREATE TABLE IF NOT EXISTS friend_tokens (
    id         INT          AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NOT NULL UNIQUE,
    token      VARCHAR(10)  NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- add table for board layout and max score
CREATE TABLE IF NOT EXISTS games (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT NULL,   -- legacy single-player compatibility
    host_user_id      INT NULL,
    guest_user_id     INT NULL,
    mode              VARCHAR(30) NOT NULL DEFAULT 'singleplayer',
    status            VARCHAR(30) NOT NULL DEFAULT 'WAITING',
    timer_seconds     INT NOT NULL DEFAULT 180,
    join_code         VARCHAR(20) NULL UNIQUE,
    board_layout      VARCHAR(255) NOT NULL,
    max_score         INT NOT NULL,

    -- legacy single-player fields
    final_score       INT NULL,
    found_words       TEXT NULL,

    -- real multiplayer 1v1 fields
    host_score        INT NULL,
    guest_score       INT NULL,
    host_found_words  TEXT NULL,
    guest_found_words TEXT NULL,
    winner_user_id    INT NULL,

    completed         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at      DATETIME NULL,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (host_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (guest_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (winner_user_id) REFERENCES users(user_id) ON DELETE SET NULL
    );

CREATE INDEX idx_games_user_id ON games (user_id, created_at DESC);
CREATE INDEX idx_games_completed ON games (completed, completed_at DESC);
CREATE INDEX idx_games_join_code ON games (join_code);
CREATE INDEX idx_games_host_user_id ON games (host_user_id, created_at DESC);
CREATE INDEX idx_games_guest_user_id ON games (guest_user_id, created_at DESC);
CREATE INDEX idx_games_winner_user_id ON games (winner_user_id);

-- Normalized word storage alongside found_words.
-- Backend can write here for richer queries without touching
-- existing found_words logic.
CREATE TABLE IF NOT EXISTS words_played (
    id        INT          AUTO_INCREMENT PRIMARY KEY,
    game_id   INT          NOT NULL,
    word      VARCHAR(50)  NOT NULL,
    points    INT          NOT NULL,
    path      JSON         NOT NULL,
    played_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX idx_words_game_id ON words_played (game_id);

-- ============================================================
-- REFRESH TOKENS
-- JWT rotation
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         INT          AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NOT NULL,
    token      VARCHAR(512) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_expires ON refresh_tokens (expires_at);

-- ============================================================
-- FEEDBACK
-- user_id is nullable so anonymous submissions still work
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
    id         INT          AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NULL,
    category   VARCHAR(50)  NOT NULL,
    message    TEXT         NOT NULL,
    contact    VARCHAR(254) NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- LEADERBOARD VIEW  (read-only)
-- ============================================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    u.user_id,
    u.username,
    u.high_score,
    u.number_of_games_played,
    COUNT(g.id)                               AS completed_games,
    COALESCE(ROUND(AVG(g.final_score), 1), 0) AS avg_score,
    COALESCE(MAX(g.final_score), 0)           AS best_game_score
FROM users u
LEFT JOIN games g ON g.user_id = u.user_id AND g.completed = TRUE
GROUP BY u.user_id, u.username, u.high_score, u.number_of_games_played
ORDER BY u.high_score DESC;

-- ============================================================
-- MATCH HISTORY VIEW  (read only)
-- Usage: SELECT * FROM match_history WHERE user_id = ?
-- ============================================================
CREATE OR REPLACE VIEW match_history AS
SELECT
    g.id            AS game_id,
    g.user_id,
    u.username,
    g.board_layout,
    g.max_score,
    g.final_score,
    g.found_words,
    g.completed,
    g.created_at    AS started_at,
    g.completed_at,
    COUNT(w.id)     AS words_found_normalized
FROM games g
LEFT JOIN users u ON u.user_id = g.user_id
LEFT JOIN words_played w ON w.game_id = g.id
GROUP BY
    g.id, g.user_id, u.username, g.board_layout,
    g.max_score, g.final_score, g.found_words,
    g.completed, g.created_at, g.completed_at
ORDER BY g.created_at DESC;