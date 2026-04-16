# =============================================================================
# UWoggle — Makefile
#
# Usage:
#   make            — start the full stack (db → backend → game-service → frontend)
#   make db         — start only the MySQL container
#   make backend    — start only the Flask backend
#   make game       — start only the Java game service
#   make frontend   — start only the React dev server
#   make stop       — stop and remove all Docker containers
#   make logs       — tail logs from all running containers
#   make clean      — stop containers + remove the MySQL data volume
#   make install    — install all dependencies (Python + Node)
#   make seed       — re-run seed.sql against the running DB
# =============================================================================

SHELL := /bin/bash

# Paths (adjust if your folder layout differs)
ROOT_DIR     := $(shell pwd)
DB_DIR       := $(ROOT_DIR)/db
BACKEND_DIR  := $(ROOT_DIR)/backend
GAME_DIR     := $(ROOT_DIR)/game-service
FRONTEND_DIR := $(ROOT_DIR)/frontend/UWoggleFrontend

# How long to wait for MySQL to be ready before starting the backend
DB_WAIT_SECS := 20

.PHONY: all db backend game frontend stop logs clean install seed test

# ── Default target: full stack ────────────────────────────────────────────────
all: db
	@echo ""
	@echo "⏳  Waiting $(DB_WAIT_SECS)s for MySQL to be ready..."
	@sleep $(DB_WAIT_SECS)
	@$(MAKE) --no-print-directory backend &
	@$(MAKE) --no-print-directory game &
	@$(MAKE) --no-print-directory frontend
	@echo ""
	@echo "✅  UWoggle is running:"
	@echo "    Frontend  → http://localhost:5173"
	@echo "    Backend   → http://localhost:5000"
	@echo "    Game Svc  → http://localhost:8080"
	@echo "    MySQL     → localhost:3306"

# ── Database ──────────────────────────────────────────────────────────────────
db:
	@echo "🐳  Starting MySQL via Docker Compose..."
	cd $(DB_DIR) && docker compose up -d
	@echo "✅  MySQL container started."

# ── Flask backend ─────────────────────────────────────────────────────────────
backend:
	@echo "🐍  Starting Flask backend on :5000..."
	cd $(BACKEND_DIR) && \
		source .venv/bin/activate && \
		python app.py

# ── Java game service ─────────────────────────────────────────────────────────
game:
	@echo "☕  Building and starting Java game service on :8080..."
	cd $(GAME_DIR) && ./gradlew bootRun --quiet

# ── React frontend ────────────────────────────────────────────────────────────
frontend:
	@echo "⚛️   Starting React frontend on :5173..."
	cd $(FRONTEND_DIR) && npm run dev

# ── Stop all services ─────────────────────────────────────────────────────────
stop:
	@echo "🛑  Stopping Docker containers..."
	cd $(DB_DIR) && docker compose down
	@echo "✅  Containers stopped."
	@echo "ℹ️   Flask and game-service were run in foreground — close those terminals manually."

# ── Tail container logs ───────────────────────────────────────────────────────
logs:
	cd $(DB_DIR) && docker compose logs -f

# ── Remove containers + data volume (full reset) ─────────────────────────────
clean:
	@echo "🧹  Removing containers and MySQL volume..."
	cd $(DB_DIR) && docker compose down -v
	@echo "✅  Clean complete. Run 'make db' to start fresh."

# ── Install dependencies ──────────────────────────────────────────────────────
install: install-python install-node

install-python:
	@echo "🐍  Setting up Python virtual environment..."
	cd $(BACKEND_DIR) && \
		python3 -m venv .venv && \
		source .venv/bin/activate && \
		pip install --upgrade pip && \
		pip install -r requirements.txt
	@echo "✅  Python dependencies installed."

install-node:
	@echo "📦  Installing Node dependencies..."
	cd $(FRONTEND_DIR) && npm install
	@echo "✅  Node dependencies installed."

# ── Re-seed the database ──────────────────────────────────────────────────────
seed:
	@echo "🌱  Seeding database..."
	cd $(DB_DIR) && \
		docker compose exec -T mysql \
			mysql -u$$(grep MYSQL_USER .env | cut -d= -f2) \
			      -p$$(grep MYSQL_PASSWORD .env | cut -d= -f2) \
			      uwoggle < seed.sql
	@echo "✅  Seed complete."

# ── Run all tests ─────────────────────────────────────────────────────────────
test:
	@echo "🧪  Running backend tests..."
	cd $(BACKEND_DIR) && \
		source .venv/bin/activate && \
		PYTHONPATH=$(BACKEND_DIR) pytest tests/ -v
	@echo "🧪  Running Java game-service tests..."
	cd $(GAME_DIR) && ./gradlew test
	@echo "✅  All tests complete."