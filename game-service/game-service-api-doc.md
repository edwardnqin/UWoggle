# Game-Service API Documentation

running on https://localhost:8080

### In BoardController.java

- GET /board — returns a random, Boggle-valid 4x4 board

### In GameController.java

- POST /api/games — creates a new game
- POST /api/games/join/{joinCode} — join game with code
- GET /api/games/{id} — Returns a game with specific id
- POST /api/games/{id}/score — submits a score for a game with specific id
