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
  getMe,
  getCurrentUser,
  saveGameHistory,
  fetchGameHistory,
} from "./services/api";

const VIEWS = {
  home: { title: null, subtitle: null },
  unlimited: { title: null, subtitle: null },
  timed: { title: null, subtitle: null },
  end: { title: "GAME END", subtitle: "Here are the game stats:" },
  online: { title: "Online", subtitle: "Matchmaking / lobby / invite-a-friend can live here." },
  history: { title: "History", subtitle: "Recent games, best words, scores, streaks, win/loss, etc." },
};

export default function App() {
  const [view, setView] = useState("home");
  const [timerDuration, setTimerDuration] = useState(null);
  const [lastGameStats, setLastGameStats] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [guestHistory, setGuestHistory] = useState([]);
  const [savedHistory, setSavedHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [fbCategory, setFbCategory] = useState("suggestion");
  const [fbMessage, setFbMessage] = useState("");
  const [fbContact, setFbContact] = useState("");
  const [fbStatus, setFbStatus] = useState(null);

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

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

  const current = VIEWS[view];

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
    async function restoreSession() {
      try {
        const { ok, data } = await getCurrentUser();
        if (ok && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) {
      setSavedHistory([]);
      setHistoryError("");
      return;
    }

    loadSavedHistory();
  }, [user]);

  async function loadSavedHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const { ok, data } = await fetchGameHistory();
      if (ok) {
        setSavedHistory(data.records || []);
      } else {
        setHistoryError(data.error || "Could not load your saved history.");
      }
    } catch {
      setHistoryError("Could not load your saved history.");
    } finally {
      setHistoryLoading(false);
    }
  }

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

  function addGuestHistoryRecord(stats) {
    if (!stats) return;

    setGuestHistory((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        playedAt: new Date().toLocaleString(),
        ...stats,
      },
      ...prev,
    ]);
  }

  function addHistoryRecord(stats) {
    if (!stats) return;

    if (!user) {
      setGuestHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          playedAt: new Date().toLocaleString(),
          ...stats,
        },
        ...prev,
      ]);
    } else {
      setUserHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          playedAt: new Date().toLocaleString(),
          ...stats,
        },
        ...prev,
      ]);
    }
  }

  async function finalizeGame(stats) {
    setLastGameStats(stats);

    if (!user) {
      addGuestHistoryRecord(stats);
      setView("end");
      return;
    }

    try {
      const { ok, data } = await saveGameHistory(stats);
      if (ok && data.record) {
        setSavedHistory((prev) => [data.record, ...prev]);
      }
    } catch {
      // End screen still opens even if saving fails.
    }

    setView("end");
  }

  async function handleHistoryOpen() {
    if (!user) {
      window.alert(
        "You are not logged in. Sign up or log in to save history permanently. Guest game history will stay until you refresh or leave the page."
      );
      setView("history");
      return;
    }

    await loadSavedHistory();
    setView("history");
  }

  function handleMultiplayerOpen() {
    if (!user) {
      window.alert("Please create an account or log in to use Multiplayer.");
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

  if (!authChecked) {
    return <div className="app"></div>;
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
          />
        ) : (
          <Placeholder title={current.title} subtitle={current.subtitle} onBack={() => setView("home")} />
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

      <Modal title="Feedback" open={feedbackOpen} onClose={() => setFeedbackOpen(false)}>
        <div className="field">
          <label htmlFor="fb-category">Category</label>
          <select id="fb-category" value={fbCategory} onChange={(e) => setFbCategory(e.target.value)}>
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
            placeholder="Email / Discord"
            value={fbContact}
            onChange={(e) => setFbContact(e.target.value)}
          />
        </div>

        {fbStatus === "sent" ? (
          <div className="modalHint">Thanks! Your feedback was sent.</div>
        ) : fbStatus === "error" ? (
          <div className="modalHint">Could not send feedback. Please try again.</div>
        ) : null}

        <div className="modalActions">
          <HudButton variant="miniCancel" onClick={() => setFeedbackOpen(false)}>
            Cancel
          </HudButton>
          <HudButton
            variant="mini"
            onClick={async () => {
              setFbStatus(null);
              try {
                const res = await fetch("/api/feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    category: fbCategory,
                    message: fbMessage,
                    contact: fbContact || null,
                  }),
                });
                if (!res.ok) throw new Error("bad");
                setFbStatus("sent");
                setFbMessage("");
                setFbContact("");
              } catch {
                setFbStatus("error");
              }
            }}
          >
            Send
          </HudButton>
        </div>
      </Modal>
    </div>
  );
}
