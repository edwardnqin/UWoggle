CREATE DATABASE IF NOT EXISTS uwoggle;
USE uwoggle;

-- Core user table
CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_verified   BOOLEAN      NOT NULL DEFAULT FALSE
);

-- Holds the verification token emailed to the user after signup
-- Flask dev will generate the token, store it here, and delete it once verified
CREATE TABLE email_verifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NOT NULL,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE friends (
    id INT AUTO_INCREMENT PRIMARY KEY,

    requester_id INT NOT NULL,
    addressee_id INT NOT NULL,

    status ENUM('PENDING', 'ACCEPTED') NOT NULL DEFAULT 'PENDING',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME NULL,

    -- this won't allow us to self friend ourself
    CONSTRAINT chk_not_self_friend CHECK (requester_id <> addressee_id),

    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- allow only one row per pair no matter what direction
ALTER TABLE friends
    ADD COLUMN user_low  INT GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
    ADD COLUMN user_high INT GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
    ADD UNIQUE KEY uq_friend_pair (user_low, user_high);

-- for looking up
CREATE INDEX idx_friends_requester ON friends (requester_id, status);
CREATE INDEX idx_friends_addressee ON friends (addressee_id, status);

-- add table for board layout and max score
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_layout VARCHAR(255) NOT NULL,
    max_score INT NOT NULL,
    final_score INT NULL,
    found_words TEXT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL
);