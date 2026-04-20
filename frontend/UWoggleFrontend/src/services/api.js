/**
 * api.js — Centralized API service for UWoggle.
 */

const BASE = "/api";
const GAME_SERVICE_BASE = "http://localhost:8080/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function gameServiceRequest(path, options = {}) {
  const res = await fetch(`${GAME_SERVICE_BASE}${path}`, {
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

export async function deleteGameHistory(recordId) {
  return request(`/games/history/${recordId}`, {
    method: "DELETE",
  });
}

export async function fetchFriends(userId) {
  return request(`/friends/${userId}`, { method: "GET" });
}

export async function fetchFriendRequests(userId) {
  return request(`/friends/${userId}/requests`, { method: "GET" });
}

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
  return gameServiceRequest("/board", {
    method: "GET",
  });
}

export async function createMultiplayerGame(timerSeconds, hostName) {
  return gameServiceRequest("/games", {
    method: "POST",
    body: JSON.stringify({
      mode: "multiplayer",
      timerSeconds,
      hostName,
    }),
  });
}

export async function joinMultiplayerGame(joinCode, guestName) {
  const query = guestName ? `?guestName=${encodeURIComponent(guestName)}` : "";
  return gameServiceRequest(`/games/join/${encodeURIComponent(joinCode)}${query}`, {
    method: "POST",
  });
}

export async function getGameSession(gameId) {
  return gameServiceRequest(`/games/${gameId}`, {
    method: "GET",
  });
}

export async function updateMultiplayerProgress(gameId, playerRole, currentScore, foundWords) {
  return gameServiceRequest(`/games/${gameId}/progress`, {
    method: "POST",
    body: JSON.stringify({
      playerRole,
      currentScore,
      foundWords,
    }),
  });
}

export async function submitMultiplayerScore(gameId, playerRole, finalScore, foundWords) {
  return gameServiceRequest(`/games/${gameId}/score`, {
    method: "POST",
    body: JSON.stringify({
      playerRole,
      finalScore,
      foundWords,
    }),
  });
}

export function getGameWebSocketUrl(gameId) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host =
    window.location.hostname === "localhost"
      ? "localhost:8080"
      : window.location.host;

  return `${protocol}//${host}/ws/games?gameId=${encodeURIComponent(gameId)}`;
}