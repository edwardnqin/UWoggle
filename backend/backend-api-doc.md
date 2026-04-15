# Backend API Documentation

running on https://localhost:5000

### Authentication endpoints:

- POST /api/users — Register a new user (sends verification email)
- POST /api/login — Log in (requires verified email)
- POST /api/logout — Log out (clears JWT cookie)
- GET /api/verify — Verify email from link (?token=...)
- POST /api/resend-verification — Resend verification email

### Board endpoints:

- GET /api/board — Fetch a new Boggle board from the game service

### Feedback endpoints:

- POST /api/feedback — Create a new JS object of the following format: {"category": "bug"|"suggestion"|"ui"|"other", "message": "...", "contact": "..."}
- GET /api/feedback — Returns the most recent feedback entries (JSON)
- GET /api/feedback/view — View a simple HTML table for quick viewing in a browser

### Friend endpoints:

<!-- Username-based invites: POST /request sends requester_id + username (no token table). -->

- GET /api/friends/<user_id> — list accepted friends
- GET /api/friends/<user_id>/requests — list pending (incoming/outgoing)
- POST /api/friends/request — send friend request (JSON body: `requester_id`, `username` of the user to invite; username match is case-insensitive)
- POST /api/friends/<request_id>/respond — accept/decline request
- DELETE /api/friends/remove — remove an accepted friend (requires JWT cookie; JSON body: `{ "friend_id": <int> }`; deletes the shared friendship row so both users no longer see each other)

### Multiplayer Room endpoints:

- POST /api/rooms — create a room
- POST /api/rooms/\<code>/join — join a room
- GET /api/rooms/\<code>/status — poll room state + scores
- POST /api/rooms/\<code>/start — start the game (host only)
- POST /api/rooms/\<code>/submit — submit final score + words
