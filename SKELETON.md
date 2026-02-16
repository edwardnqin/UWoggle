# UWoggle — Skeleton

## High-Level Architecture

This project is split into a React single-page frontend and a set of containerized backend services orchestrated with Docker Compose.


- **Docker Compose** runs the services as separate containers on a shared internal network.
- Services communicate primarily over **HTTP/REST** (container-to-container), while the database is accessed via **SQL**.

---

## Components

### Frontend (React SPA)
- A React Single Page Application (SPA) that handles:
  - Authentication UI flows (login/register)
  - Game UI (board display, timer, word entry, scoring display)
  - Friends and leaderboard views
- Communicates with the Backend via HTTP (JSON APIs).

---

### Backend API (Python + Flask)
Responsible for “application” features and coordinating game sessions:
- **Authentication** (e.g., JWT-based auth using PyJWT)
- **Friends / Social** features
- **Leaderboard** endpoints
- **Game session orchestration** (creating/joining games, saving results)

**Tech:** Python, Flask, PyJWT (plus typical supporting libraries such as a DB driver/ORM).

---

### Game Logic Service (Java + Spring Boot)
Responsible for core Boggle gameplay logic:
- **Board generation**
- **Scoring**
- **Word validation**
  - Example approach: DFS/backtracking through the board to check if a submitted word can be formed
- Ideally remains **stateless**, with the Backend storing persistent game results.

**Tech:** Java, Spring Boot

---

### Dictionary / Lookup
A dictionary used for fast “is this a real English word?” checks.
- ~180k English words loaded at startup into an in-memory structure
- Default approach: **HashSet** for O(1) average membership checks
  - Startup time and memory usage should be monitored; the dictionary can be mounted as a file and loaded on boot.

---

### Database (MySQL)
Persistent storage for application data such as:
- Users, hashed passwords (or auth provider IDs)
- Friends relationships
- Game sessions and match history
- Leaderboard stats / aggregates