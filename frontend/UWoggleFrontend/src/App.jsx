import { useState, useEffect } from "react";
import "./App.css";

import Home from "./pages/Home";
import Placeholder from "./pages/Placeholder";
import SingleUnlimited from "./pages/SingleUnlimited";
import SingleTimed from "./pages/SingleTimed";
import EndScreen from "./pages/EndScreen";
import History from "./pages/History";

import Modal from "./components/ui/Modal";
import HudButton from "./components/ui/HudButton";

import {
  login,
  register,
  logout,
  resendVerification,
  getCurrentUser,
  saveGameHistory,
  fetchGameHistory,
  deleteGameHistory,
} from "./services/api";
import MultiplayerLobby from "./pages/MultiplayerLobby";
import MultiplayerGame from "./pages/MultiplayerGame";

const VIEWS = {
  home: { title: null, subtitle: null },
  unlimited: { title: null, subtitle: null },
  timed: { title: null, subtitle: null },
  end: { title: "GAME END", subtitle: "Here are the game stats:" },
  online: { title: "Online", subtitle: "Matchmaking / lobby / invite-a-friend can live here." },
  multiplayerGame: { title: null, subtitle: null },
  history: { title: "History", subtitle: "Recent games, best words, scores, streaks, win/loss, etc." },
};

const GUEST_PROMPTS = {
  history: {
    title: "History as a Guest",
    description:
      "You can still view history from this browser session, but guest history is cleared when you refresh or leave the page.",
    bullets: [
      "Continue as a guest to view games played in this session.",
      "Log in or sign up to save history across sessions.",
    ],
  },
  multiplayer: {
    title: "Multiplayer as a Guest",
    description:
      "You can still create or join a multiplayer game as a guest. Signing in helps when you want a more complete account-based experience.",
    bullets: [
      "Guests can create or join a game with a temporary name.",
      "Account-based social features can be added on top of multiplayer later.",
    ],
  },
};

function normalizeHistoryResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data?.records)) return response.data.records;
  if (Array.isArray(response?.data?.history)) return response.data.history;
  if (Array.isArray(response?.records)) return response.records;
  if (Array.isArray(response?.history)) return response.history;
  return [];
}

function extractCurrentUser(response) {
  if (response?.data?.user) return response.data.user;
  if (response?.user) return response.user;
  return null;
}

export default function App() {
  const [view, setView] = useState("home");
  const [timerDuration, setTimerDuration] = useState(null);
  const [lastGameStats, setLastGameStats] = useState(null);

  const [guestHistory, setGuestHistory] = useState([]);
  const [savedHistory, setSavedHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [deletingHistoryId, setDeletingHistoryId] = useState(null);

  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const [guestPromptType, setGuestPromptType] = useState(null);

  const [fbCategory, setFbCategory] = useState("suggestion");
  const [fbMessage, setFbMessage] = useState("");
  const [fbContact, setFbContact] = useState("");
  const [fbStatus, setFbStatus] = useState(null);

  const [user, setUser] = useState(null);

  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifySuccess, setVerifySuccess] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const [suUsername, setSuUsername] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suError, setSuError] = useState("");
  const [suSuccess, setSuSuccess] = useState("");
  const [suLoading, setSuLoading] = useState(false);

  const [multiplayerGameId, setMultiplayerGameId] = useState(null);
  const [multiplayerRole, setMultiplayerRole] = useState(null);

  const current = VIEWS[view] || { title: null, subtitle: null };
  const guestPrompt = guestPromptType ? GUEST_PROMPTS[guestPromptType] : null;

  function enterMultiplayerGame(gameId, role) {
    setMultiplayerGameId(gameId);
    setMultiplayerRole(role);
    setView("multiplayerGame");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) return;

    window.history.replaceState({}, document.title, "/");

    fetch(`/api/verify?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        setVerifyMsg(data.message || data.error || "Verification complete.");
        setVerifySuccess(data.status === 200);
      })
      .catch(() => {
        setVerifyMsg("Verification failed. Please try again.");
        setVerifySuccess(false);
      });
  }, []);

  useEffect(() => {
  async function loadCurrentUser() {
    try {
      const response = await getCurrentUser();
      const currentUser = extractCurrentUser(response);

      if (currentUser) {
        setUser(currentUser);
        return;
      }

      setUser(null);
    } catch {
      setUser(null);
    }
  }

  loadCurrentUser();
}, []);


  useEffect(() => {
    async function loadHistory() {
      if (!user) {
        setSavedHistory([]);
        setHistoryError("");
        return;
      }

      setHistoryLoading(true);
      setHistoryError("");

      try {
        const response = await fetchGameHistory();
        setSavedHistory(normalizeHistoryResponse(response));
      } catch {
        setHistoryError("Could not load history.");
        setSavedHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [user]);

  function closeLogin() {
    setLoginOpen(false);
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
    setShowResend(false);
    setResendMsg("");
  }

  function closeSignup() {
    setSignupOpen(false);
    setSuUsername("");
    setSuEmail("");
    setSuPassword("");
    setSuError("");
    setSuSuccess("");
  }

  function openGuestPrompt(type) {
    setGuestPromptType(type);
    setGuestPromptOpen(true);
  }

  function closeGuestPrompt() {
    setGuestPromptOpen(false);
    setGuestPromptType(null);
  }

  function continueAsGuest() {
    if (guestPromptType === "history") {
      setView("history");
    } else if (guestPromptType === "multiplayer") {
      setView("online");
    }

    closeGuestPrompt();
  }

  function openLoginFromGuestPrompt() {
    closeGuestPrompt();
    setLoginOpen(true);
  }

  function openSignupFromGuestPrompt() {
    closeGuestPrompt();
    setSignupOpen(true);
  }

  function addGuestHistoryRecord(stats) {
    if (user || !stats) return;

    setGuestHistory((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        playedAt: new Date().toLocaleString(),
        ...stats,
      },
      ...prev,
    ]);
  }

  async function persistUserHistory(stats) {
    if (!user || !stats) return;

    try {
      await saveGameHistory(stats);
      const response = await fetchGameHistory();
      setSavedHistory(normalizeHistoryResponse(response));
    } catch {
      setHistoryError("Could not save game history.");
    }
  }

  function finalizeGame(stats) {
    setLastGameStats(stats);
    addGuestHistoryRecord(stats);
    persistUserHistory(stats);
    setView("end");
  }

  async function handleDeleteHistoryRecord(recordId) {
    if (!user || !recordId) return;

    setHistoryError("");
    setDeletingHistoryId(recordId);

    try {
      const response = await deleteGameHistory(recordId);
      if (!response.ok) {
        throw new Error(response?.data?.error || "Could not delete game history.");
      }

      const refreshed = await fetchGameHistory();
      setSavedHistory(normalizeHistoryResponse(refreshed));
    } catch (error) {
      setHistoryError(error?.message || "Could not delete game history.");
    } finally {
      setDeletingHistoryId(null);
    }
  }

  function handleHistoryOpen() {
    if (!user) {
      openGuestPrompt("history");
      return;
    }

    setView("history");
  }

  function handleMultiplayerOpen() {
    if (!user) {
      openGuestPrompt("multiplayer");
      return;
    }

    setView("online");
  }

  async function handleLogin() {
    setLoginError("");
    setShowResend(false);
    setResendMsg("");

    if (!loginEmail || !loginPassword) {
      setLoginError("Email and password are required.");
      return;
    }

    setLoginLoading(true);
    try {
      const { ok, status, data } = await login(loginEmail, loginPassword);

      if (ok) {
        setUser(data.user);
        closeLogin();
      } else if (status === 403 && data.resend_available) {
        setLoginError(data.error);
        setShowResend(true);
      } else {
        setLoginError(data.error || "Login failed. Please try again.");
      }
    } catch {
      setLoginError("Could not reach the server. Is the backend running?");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    setUser(null);
    setSavedHistory([]);
    try {
      await logout();
    } catch {
      // no-op
    }
  }

  async function handleResendVerification() {
    setResendMsg("");
    try {
      await resendVerification(loginEmail);
      setResendMsg("Verification email sent! Check your inbox.");
    } catch {
      setResendMsg("Failed to send. Please try again later.");
    }
  }

  async function handleSignup() {
    setSuError("");
    setSuSuccess("");

    if (!suUsername || !suEmail || !suPassword) {
      setSuError("All fields are required.");
      return;
    }

    setSuLoading(true);
    try {
      const { ok, status, data } = await register(suUsername, suEmail, suPassword);

      if (ok || status === 201) {
        setSuSuccess(data.message || "Account created! Check your email to verify.");
      } else if (data.fields) {
        setSuError(Object.values(data.fields).join(" "));
      } else {
        setSuError(data.error || "Registration failed. Please try again.");
      }
    } catch {
      setSuError("Could not reach the server. Is the backend running?");
    } finally {
      setSuLoading(false);
    }
  }

  return (
    <div className="app">
      {verifyMsg && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            padding: "14px 24px",
            textAlign: "center",
            fontWeight: "bold",
            background: verifySuccess ? "#27ae60" : "#c0392b",
            color: "#fff",
          }}
        >
          {verifyMsg}
          <button
            onClick={() => setVerifyMsg("")}
            style={{
              marginLeft: 16,
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="shell">
        {view === "home" ? (
          <Home
            onGo={setView}
            onOpenHistory={handleHistoryOpen}
            onOpenMultiplayer={handleMultiplayerOpen}
            onSetTimerDuration={setTimerDuration}
            onLogin={() => setLoginOpen(true)}
            onSignup={() => setSignupOpen(true)}
            onLogout={handleLogout}
            onFeedback={() => {
              setFbStatus(null);
              setFeedbackOpen(true);
            }}
            user={user}
          />
        ) : view === "unlimited" ? (
          <SingleUnlimited
            title={current.title}
            subtitle={current.subtitle}
            onGiveUp={finalizeGame}
          />
        ) : view === "timed" ? (
          <SingleTimed
            timerDuration={timerDuration}
            title={current.title}
            subtitle={current.subtitle}
            onGiveUp={finalizeGame}
            onTimeUp={finalizeGame}
          />
        ) : view === "end" ? (
          <EndScreen
            title={current.title}
            subtitle={current.subtitle}
            gameStats={lastGameStats}
            onReturn={() => setView("home")}
          />
        ) : view === "history" ? (
          <History
            onBack={() => setView("home")}
            records={user ? savedHistory : guestHistory}
            user={user}
            loading={historyLoading}
            error={historyError}
            onDeleteRecord={handleDeleteHistoryRecord}
            deletingRecordId={deletingHistoryId}
          />
        ) : view === "online" ? (
          <MultiplayerLobby
            onBack={() => setView("home")}
            onEnterGame={enterMultiplayerGame}
            onOpenLogin={() => setLoginOpen(true)}
            onOpenSignup={() => setSignupOpen(true)}
            user={user}
          />
        ) : view === "multiplayerGame" ? (
          <MultiplayerGame
            gameId={multiplayerGameId}
            playerRole={multiplayerRole}
            onBackToHome={() => setView("home")}
          />
        ) : (
          <Placeholder
            title={current.title}
            subtitle={current.subtitle}
            onBack={() => setView("home")}
          />
        )}
      </div>

      <Modal title="Login" open={loginOpen} onClose={closeLogin}>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="team25@wisc.edu"
            autoComplete="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        {loginError && <p className="formError">{loginError}</p>}
        {showResend && (
          <div className="formResend">
            <button className="linkBtn" onClick={handleResendVerification}>
              Resend verification email
            </button>
            {resendMsg && <p className="formSuccess">{resendMsg}</p>}
          </div>
        )}

        <div className="modalActions">
          <HudButton variant="miniCancel" onClick={closeLogin}>
            Cancel
          </HudButton>
          <HudButton variant="mini" onClick={handleLogin}>
            {loginLoading ? "Logging in…" : "Login"}
          </HudButton>
        </div>
      </Modal>

      <Modal title="Sign Up" open={signupOpen} onClose={closeSignup}>
        <div className="field">
          <label htmlFor="su-email">Email</label>
          <input
            id="su-email"
            type="email"
            placeholder="you@wisc.edu"
            autoComplete="email"
            value={suEmail}
            onChange={(e) => setSuEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="su-username">Username</label>
          <input
            id="su-username"
            placeholder="badgerWords123"
            autoComplete="username"
            value={suUsername}
            onChange={(e) => setSuUsername(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="su-password">Password</label>
          <input
            id="su-password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={suPassword}
            onChange={(e) => setSuPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignup()}
          />
        </div>

        {suError && <p className="formError">{suError}</p>}
        {suSuccess && <p className="formSuccess">{suSuccess}</p>}

        <div className="modalActions">
          <HudButton variant="miniCancel" onClick={closeSignup}>
            Cancel
          </HudButton>
          {!suSuccess && (
            <HudButton variant="mini" onClick={handleSignup}>
              {suLoading ? "Creating…" : "Create"}
            </HudButton>
          )}
        </div>
      </Modal>

      <Modal title="Guest access" open={guestPromptOpen} onClose={closeGuestPrompt}>
        {guestPrompt && (
          <>
            <div className="modalTextBlock">
              <p className="modalLead">{guestPrompt.title}</p>
              <p>{guestPrompt.description}</p>
              <ul className="modalBulletList">
                {guestPrompt.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>

            <div className="modalActions modalActions--wrap modalActions--start">
              <HudButton variant="miniCancel" onClick={continueAsGuest}>
                Continue as Guest
              </HudButton>
              <HudButton variant="mini" onClick={openLoginFromGuestPrompt}>
                Log In
              </HudButton>
              <HudButton variant="mini" onClick={openSignupFromGuestPrompt}>
                Sign Up
              </HudButton>
            </div>
          </>
        )}
      </Modal>

      <Modal title="Feedback" open={feedbackOpen} onClose={() => setFeedbackOpen(false)}>
        <div className="field">
          <label htmlFor="fb-category">Category</label>
          <select
            id="fb-category"
            value={fbCategory}
            onChange={(e) => setFbCategory(e.target.value)}
          >
            <option value="bug">Bug</option>
            <option value="suggestion">Suggestion</option>
            <option value="ui">UI/UX</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="fb-message">Message</label>
          <textarea
            id="fb-message"
            rows={5}
            placeholder="Tell us what you think…"
            value={fbMessage}
            onChange={(e) => setFbMessage(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="fb-contact">Contact (optional)</label>
          <input
            id="fb-contact"
            value={fbContact}
            onChange={(e) => setFbContact(e.target.value)}
            placeholder="Email, Discord, etc."
          />
        </div>

        {fbStatus?.message && (
          <p className={fbStatus.ok ? "formSuccess" : "formError"}>{fbStatus.message}</p>
        )}

        <div className="modalActions">
          <HudButton variant="miniCancel" onClick={() => setFeedbackOpen(false)}>
            Cancel
          </HudButton>
          <HudButton
            variant="mini"
            onClick={async () => {
              setFbStatus(null);

              if (!fbMessage.trim()) {
                setFbStatus({
                  state: "error",
                  ok: false,
                  message: "Please enter a message before sending.",
                });
                return;
              }

              try {
                setFbStatus({ state: "sending", ok: true, message: "" });

                const resp = await fetch("/api/feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    category: fbCategory,
                    message: fbMessage.trim(),
                    contact: fbContact.trim(),
                  }),
                });

                const data = await resp.json().catch(() => ({}));

                if (resp.ok) {
                  setFbStatus({
                    state: "sent",
                    ok: true,
                    message: data.message || "Thanks for the feedback!",
                  });
                  setFbMessage("");
                  setFbContact("");
                  setFbCategory("suggestion");
                } else {
                  setFbStatus({
                    state: "error",
                    ok: false,
                    message: data.error || "Could not send feedback.",
                  });
                }
              } catch {
                setFbStatus({
                  state: "error",
                  ok: false,
                  message: "Could not reach the server.",
                });
              }
            }}
          >
            {fbStatus?.state === "sending" ? "Sending…" : "Send"}
          </HudButton>
        </div>
      </Modal>
    </div>
  );
}