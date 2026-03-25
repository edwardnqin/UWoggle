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

export async function getBoard() {
  return request("/board");
}
