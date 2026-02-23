USE uwoggle;

INSERT INTO users (email, username, password_hash, is_verified) VALUES
('test@uwoggle.com', 'testuser', '$2b$12$KiK.XBMnpMpFMmICPVgMuuBPqBBEX7EJlcqfZnWbr7bFfhTuYjAJO', TRUE);
('alice@uwoggle.com', 'alice', '$2b$12$KiK.XBMnpMpFMmICPVgMuuBPqBBEX7EJlcqfZnWbr7bFfhTuYjAJO', TRUE),
('bob@uwoggle.com', 'bob',   '$2b$12$KiK.XBMnpMpFMmICPVgMuuBPqBBEX7EJlcqfZnWbr7bFfhTuYjAJO', TRUE);

-- Alice sends bob a request (pending)
INSERT INTO friends (requester_id, addressee_id, status)
SELECT u1.id, u2.id, 'PENDING'
FROM users u1, users u2
WHERE u1.username='alice' AND u2.username='bob';

-- Testuser and alicee are always friends (ACCepted)
INSERT INTO friends (requester_id, addressee_id, status, responded_at)
SELECT u1.id, u2.id, 'ACCEPTED', NOW()
FROM users u1, users u2
WHERE u1.username='testuser' AND u2.username='alice';
