/**
 * api.js — Centralized API service for UWoggle.
 */

const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function login(email, password) {
  return request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(username, email, password) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function logout() {
  return request("/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function resendVerification(email) {
  return request("/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * GET /api/me
 * Returns the currently logged-in user from the auth cookie.
 */
export async function getMe() {
  return request("/me", {
    method: "GET",
  });
}

export async function getCurrentUser() {
  return request("/me");
}

export async function saveGameHistory(payload) {
  return request("/games/history", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchGameHistory() {
  return request("/games/history");
}

// ---------------------------------------------------------------------------
// Friends — profile sidebar: list friends, pending requests, invite by username (POST /request).
// ---------------------------------------------------------------------------

export async function fetchFriends(userId) {
  return request(`/friends/${userId}`, { method: "GET" });
}

export async function fetchFriendRequests(userId) {
  return request(`/friends/${userId}/requests`, { method: "GET" });
}

/** POST /api/friends/request — ``username`` is the other user's UWoggle login name. */
export async function sendFriendRequest(requesterId, username) {
  return request("/friends/request", {
    method: "POST",
    body: JSON.stringify({ requester_id: requesterId, username }),
  });
}

export async function respondToFriendRequest(requestId, action) {
  return request(`/friends/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

/** DELETE /api/friends/remove — logged-in user removes an accepted friend (cookie auth). */
export async function removeFriend(friendId) {
  return request("/friends/remove", {
    method: "DELETE",
    body: JSON.stringify({ friend_id: friendId }),
  });
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

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