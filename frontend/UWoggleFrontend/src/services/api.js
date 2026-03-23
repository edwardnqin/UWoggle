/**
 * api.js — Centralized API service for UWoggle.
 *
 * All fetch calls go through here so that:
 *  - The base URL is set in one place
 *  - credentials: "include" (JWT cookie) is never forgotten
 *  - Error handling is consistent across the app
 *
 * The Vite dev proxy (vite.config.js) forwards /api → http://localhost:5000,
 * so no hardcoded host is needed here.
 */

const BASE = "/api";

/** Thin wrapper that always sends/receives JSON with the auth cookie. */
async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",          // send/receive the HTTP-only JWT cookie
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * POST /api/login
 * @returns {{ ok, status, data }} — data.user on success
 */
export async function login(email, password) {
  return request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * POST /api/users  (register)
 * @returns {{ ok, status, data }}
 */
export async function register(username, email, password) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

/**
 * POST /api/logout
 * Clears the HTTP-only JWT cookie server-side.
 */
export async function logout() {
  return request("/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * POST /api/resend-verification
 */
export async function resendVerification(email) {
  return request("/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

/**
 * GET /api/board
 * Proxied by Flask → Java game-service.
 */
export async function getBoard() {
  return request("/board");
}

export async function createMultiplayerGame(timerSeconds, hostName) {
  return fetch("http://localhost:8080/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "multiplayer",
      timerSeconds,
      hostName,
    }),
  }).then(async (res) => ({
    ok: res.ok,
    status: res.status,
    data: await res.json().catch(() => ({})),
  }));
}

export async function joinMultiplayerGame(joinCode, guestName) {
  const query = guestName ? `?guestName=${encodeURIComponent(guestName)}` : "";
  return fetch(`http://localhost:8080/api/games/join/${encodeURIComponent(joinCode)}${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).then(async (res) => ({
    ok: res.ok,
    status: res.status,
    data: await res.json().catch(() => ({})),
  }));
}

export async function getGameSession(gameId) {
  return fetch(`http://localhost:8080/api/games/${gameId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  }).then(async (res) => ({
    ok: res.ok,
    status: res.status,
    data: await res.json().catch(() => ({})),
  }));
}

export async function submitMultiplayerScore(gameId, playerRole, finalScore, foundWords) {
  return fetch(`http://localhost:8080/api/games/${gameId}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerRole,
      finalScore,
      foundWords,
    }),
  }).then(async (res) => ({
    ok: res.ok,
    status: res.status,
    data: await res.json().catch(() => ({})),
  }));
}