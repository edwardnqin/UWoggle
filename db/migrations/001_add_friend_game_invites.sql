-- Run against existing uwoggle DB if init.sql was applied before friend_game_invites existed.
-- Safe to run once; skip if table already exists.

USE uwoggle;

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
