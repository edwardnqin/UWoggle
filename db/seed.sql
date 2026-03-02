USE uwoggle;

INSERT INTO users (email, username, password_hash, is_verified) VALUES
                                                                    ('test@uwoggle.com', 'testuser', '$2b$12$KiK.XBMnpMpFMmICPVgMuuBPqBBEX7EJlcqfZnWbr7bFfhTuYjAJO', TRUE),
                                                                    ('alice@uwoggle.com', 'alice', '$2b$12$KiK.XBMnpMpFMmICPVgMuuBPqBBEX7EJlcqfZnWbr7bFfhTuYjAJO', TRUE),
                                                                    ('bob@uwoggle.com', 'bob', '$2b$12$KiK.XBMnpMpFMmICPVgMuuBPqBBEX7EJlcqfZnWbr7bFfhTuYjAJO', TRUE);

-- Alice sends Bob a request (pending)
INSERT INTO friends (requester_id, addressee_id, status)
SELECT u1.user_id, u2.user_id, 'PENDING'
FROM users u1, users u2
WHERE u1.username = 'alice' AND u2.username = 'bob';

-- Testuser and Alice are already friends (accepted)
INSERT INTO friends (requester_id, addressee_id, status, responded_at)
SELECT u1.user_id, u2.user_id, 'ACCEPTED', NOW()
FROM users u1, users u2
WHERE u1.username = 'testuser' AND u2.username = 'alice';