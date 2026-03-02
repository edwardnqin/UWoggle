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