# UWoggle – Database

## Tables

### `users`
| Column          | Type         | Notes                              |
|-----------------|--------------|------------------------------------|
| `id`            | INT (PK)     | Auto-incremented, unique           |
| `email`         | VARCHAR(255) | Unique, must be verified           |
| `username`      | VARCHAR(50)  | Unique, chosen by user at signup   |
| `password_hash` | VARCHAR(255) | BCrypt hash — Flask dev handles this |
| `is_verified`   | BOOLEAN      | FALSE until email is confirmed     |

### `email_verifications`
Temporary table. Flask creates a row here when a user registers, emails them the token,
and deletes the row once they click the verification link.

---

## How registration + login works (Flask dev's job, not yours)

1. User submits email, username, password
2. Flask checks `users` — if email or username already exists → reject with 409
3. Flask inserts user with `is_verified = FALSE` and a BCrypt `password_hash`
4. Flask inserts a token into `email_verifications` and emails the user a link
5. User clicks link → Flask looks up the token, sets `is_verified = TRUE`, deletes the token row
6. On login: Flask checks email exists, `is_verified = TRUE`, then compares password with BCrypt