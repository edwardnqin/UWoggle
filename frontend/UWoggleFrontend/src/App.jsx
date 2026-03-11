import { useState, useEffect } from "react";
import "./App.css";

import Home        from "./pages/Home";
import Placeholder from "./pages/Placeholder";
import SingleUnlimited   from "./pages/SingleUnlimited";
import SingleTimed from "./pages/SingleTimed";
import EndScreen from "./pages/EndScreen";

import Modal       from "./components/ui/Modal";
import HudButton   from "./components/ui/HudButton";

import { login, register, resendVerification } from "./services/api";

const VIEWS = {
  home:    { title: null,       subtitle: null },
  unlimited:    { title: null, subtitle: null},
  timed: { title: null, subtitle: null},
  end: { title: "GAME END", subtitle: "Here are the game stats:"},
  online:  { title: "Online",   subtitle: "Matchmaking / lobby / invite-a-friend can live here." },
  history: { title: "History",  subtitle: "Recent games, best words, scores, streaks, win/loss, etc." },
};

export default function App() {
  const [view,       setView]       = useState("home");
  const [timerDuration, setTimerDuration] = useState(null); // if user chooses timed mode, set as timer duration.
  const [lastGameStats, setLastGameStats] = useState(null);
  const [loginOpen,  setLoginOpen]  = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [fbCategory, setFbCategory] = useState("suggestion");
  const [fbMessage, setFbMessage] = useState("");
  const [fbContact, setFbContact] = useState("");
  const [fbStatus, setFbStatus] = useState(null); // null | "sending" | "sent" | "error"

  // Logged-in user (null = guest)
  const [user, setUser] = useState(null);

  // ── Email verification banner ─────────────────────────────────
  const [verifyMsg,     setVerifyMsg]     = useState("");
  const [verifySuccess, setVerifySuccess] = useState(false);

  // ── Login form state ─────────────────────────────────────────
  const [loginEmail,    setLoginEmail]    = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError,    setLoginError]    = useState("");
  const [loginLoading,  setLoginLoading]  = useState(false);
  const [showResend,    setShowResend]    = useState(false);
  const [resendMsg,     setResendMsg]     = useState("");

  // ── Sign-up form state ───────────────────────────────────────
  const [suUsername, setSuUsername] = useState("");
  const [suEmail,    setSuEmail]    = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suError,    setSuError]    = useState("");
  const [suSuccess,  setSuSuccess]  = useState("");
  const [suLoading,  setSuLoading]  = useState(false);

  const current = VIEWS[view];

  // ── Email verification handler ───────────────────────────────
  // Runs once on page load. If ?token= is in the URL, call /api/verify.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");

    if (!token) return;

    // Clean the token from the URL without reloading the page
    window.history.replaceState({}, document.title, "/");

    fetch(`/api/verify?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        setVerifyMsg(data.message || data.error || "Verification complete.");
        setVerifySuccess(data.status === 200);
      })
      .catch(() => {
        setVerifyMsg("Verification failed. Please try again.");
        setVerifySuccess(false);
      });
  }, []);

  // ── Helpers ──────────────────────────────────────────────────

  function closeLogin() {
    setLoginOpen(false);
    setLoginEmail(""); setLoginPassword("");
    setLoginError(""); setShowResend(false); setResendMsg("");
  }

  function closeSignup() {
    setSignupOpen(false);
    setSuUsername(""); setSuEmail(""); setSuPassword("");
    setSuError(""); setSuSuccess("");
  }

  // ── Login handler ────────────────────────────────────────────

  async function handleLogin() {
    setLoginError(""); setShowResend(false); setResendMsg("");

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

  async function handleResendVerification() {
    setResendMsg("");
    try {
      await resendVerification(loginEmail);
      setResendMsg("Verification email sent! Check your inbox.");
    } catch {
      setResendMsg("Failed to send. Please try again later.");
    }
  }

  // ── Sign-up handler ──────────────────────────────────────────

  async function handleSignup() {
    setSuError(""); setSuSuccess("");

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

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="app">

      {/* ── Email verification banner ──────────────────────── */}
      {verifyMsg && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          padding: "14px 24px", textAlign: "center", fontWeight: "bold",
          background: verifySuccess ? "#27ae60" : "#c0392b",
          color: "#fff",
        }}>
          {verifyMsg}
          <button
            onClick={() => setVerifyMsg("")}
            style={{ marginLeft: 16, background: "none", border: "none",
                     color: "#fff", cursor: "pointer", fontSize: 18 }}
          >
            ×
          </button>
        </div>
      )}

      <div className="shell">
        {view === "home" ? (
          <Home
            onGo={setView}
            onSetTimerDuration={setTimerDuration}
            onLogin={() => setLoginOpen(true)}
            onSignup={() => setSignupOpen(true)}
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
            onGiveUp={() => setView("end")}
          />
        ) : view === "timed" ? (
          <SingleTimed 
            timerDuration={timerDuration}
            title={current.title}
            subtitle={current.subtitle}
            onGiveUp={(stats) => {
              setLastGameStats(stats);
              setView("end");
            }}
            onTimeUp={(stats) => {
              setLastGameStats(stats);
              setView("end");
            }}
          />
        ) : view === "end" ? (
          <EndScreen
            title={current.title}
            subtitle={current.subtitle}
            gameStats={lastGameStats}
            onReturn={() => setView("home")}
          />
        ) : (
          <Placeholder
            title={current.title}
            subtitle={current.subtitle}
            onBack={() => setView("home")}
          />
        )}
      </div>

      {/* ── Login Modal ───────────────────────────────────────── */}
      <Modal title="Login" open={loginOpen} onClose={closeLogin}>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="team25@wisc.edu"
            autoComplete="email"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
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
            onChange={e => setLoginPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
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
          <HudButton variant="mini" onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? "Logging in…" : "Login"}
          </HudButton>
        </div>
      </Modal>

      {/* ── Sign-Up Modal ─────────────────────────────────────── */}
      <Modal title="Sign Up" open={signupOpen} onClose={closeSignup}>
        <div className="field">
          <label htmlFor="su-email">Email</label>
          <input
            id="su-email"
            type="email"
            placeholder="you@wisc.edu"
            autoComplete="email"
            value={suEmail}
            onChange={e => setSuEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="su-username">Username</label>
          <input
            id="su-username"
            placeholder="badgerWords123"
            autoComplete="username"
            value={suUsername}
            onChange={e => setSuUsername(e.target.value)}
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
            onChange={e => setSuPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSignup()}
          />
        </div>

        {suError   && <p className="formError">{suError}</p>}
        {suSuccess && <p className="formSuccess">{suSuccess}</p>}

        <div className="modalActions">
          <HudButton variant="miniCancel" onClick={closeSignup}>
            Cancel
          </HudButton>
          {!suSuccess && (
            <HudButton variant="mini" onClick={handleSignup} disabled={suLoading}>
              {suLoading ? "Creating…" : "Create"}
            </HudButton>
          )}
        </div>
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
              if (!fbMessage.trim()) {
                setFbStatus("error");
                return;
              }
              try {
                setFbStatus("sending");
                const resp = await fetch("/api/feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    category: fbCategory,
                    message: fbMessage,
                    contact: fbContact,
                  }),
                });
                if (!resp.ok) throw new Error("bad response");
                setFbStatus("sent");
                setFbMessage("");
                setFbContact("");
              } catch {
                setFbStatus("error");
              }
            }}
          >
            {fbStatus === "sending" ? "Sending…" : "Send"}
          </HudButton>
        </div>
      </Modal>
    </div>
  );
}