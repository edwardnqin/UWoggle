CREATE DATABASE IF NOT EXISTS uwoggle;
USE uwoggle;

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

CREATE TABLE IF NOT EXISTS email_verifications (
                                                   id         INT          AUTO_INCREMENT PRIMARY KEY,
                                                   user_id    INT          NOT NULL,
                                                   token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

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

ALTER TABLE friends
    ADD COLUMN user_low  INT GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
    ADD COLUMN user_high INT GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
    ADD UNIQUE KEY uq_friend_pair (user_low, user_high);

CREATE INDEX idx_friends_requester ON friends (requester_id, status);
CREATE INDEX idx_friends_addressee ON friends (addressee_id, status);

-- In-app multiplayer invites: host creates game in Java game service, then registers invite here so the
-- invitee can see a pending item and join with the same join_code. Status: PENDING | ACCEPTED | DECLINED | CANCELLED.
-- At most one row per game_id (one invite per lobby).
CREATE TABLE IF NOT EXISTS friend_game_invites (
    id              INT      AUTO_INCREMENT PRIMARY KEY,
    host_user_id    INT      NOT NULL,
    invitee_user_id INT      NOT NULL,
    game_id         BIGINT   NOT NULL,
    join_code       VARCHAR(20) NOT NULL,
    status          ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_invite_not_self CHECK (host_user_id <> invitee_user_id),
    CONSTRAINT uq_friend_game_invite_game UNIQUE (game_id),
    FOREIGN KEY (host_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_friend_game_invites_invitee_status
    ON friend_game_invites (invitee_user_id, status);
CREATE INDEX idx_friend_game_invites_host ON friend_game_invites (host_user_id, status);

CREATE TABLE IF NOT EXISTS friend_tokens (
                                             id         INT          AUTO_INCREMENT PRIMARY KEY,
                                             user_id    INT          NOT NULL UNIQUE,
                                             token      VARCHAR(10)  NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS games (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    mode              VARCHAR(30) NOT NULL DEFAULT 'singleplayer',
    status            VARCHAR(30) NOT NULL DEFAULT 'WAITING',
    timer_seconds     INT NOT NULL DEFAULT 180,
    join_code         VARCHAR(20) NULL UNIQUE,

    host_name         VARCHAR(50) NULL,
    guest_name        VARCHAR(50) NULL,

    board_layout      VARCHAR(255) NOT NULL,
    max_score         INT NOT NULL,

    host_score        INT NULL,
    guest_score       INT NULL,
    host_found_words  TEXT NULL,
    guest_found_words TEXT NULL,
    host_submitted    BOOLEAN NOT NULL DEFAULT FALSE,
    guest_submitted   BOOLEAN NOT NULL DEFAULT FALSE,
    winner_slot       VARCHAR(10) NULL,

    completed         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at        DATETIME NULL,
    completed_at      DATETIME NULL
    );

CREATE INDEX idx_games_completed ON games (completed, completed_at DESC);
CREATE INDEX idx_games_join_code ON games (join_code);

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

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id         INT          AUTO_INCREMENT PRIMARY KEY,
                                              user_id    INT          NOT NULL,
                                              token      VARCHAR(512) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

CREATE INDEX idx_refresh_expires ON refresh_tokens (expires_at);

CREATE TABLE IF NOT EXISTS feedback (
                                        id         INT          AUTO_INCREMENT PRIMARY KEY,
                                        user_id    INT          NULL,
                                        category   VARCHAR(50)  NOT NULL,
    message    TEXT         NOT NULL,
    contact    VARCHAR(254) NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
    );