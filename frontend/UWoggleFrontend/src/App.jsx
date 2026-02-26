import React, { useState } from "react";
import "./App.css";

import Home from "./pages/Home";
import Placeholder from "./pages/Placeholder";
import Play from "./pages/Play";
import Modal from "./components/ui/Modal";
import HudButton from "./components/ui/HudButton";

const VIEWS = {
  home: { title: null, subtitle: null },
  play: {
    title: "Play",
    subtitle: "Hook this up to your game board screen (timer, board generation, scoring).",
  },
  online: {
    title: "Online",
    subtitle: "Matchmaking / lobby / invite-a-friend can live here.",
  },
  history: {
    title: "History",
    subtitle: "Recent games, best words, scores, streaks, win/loss, etc.",
  },
};

export default function App() {
  const [view, setView] = useState("home");
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [fbCategory, setFbCategory] = useState("suggestion");
  const [fbMessage, setFbMessage] = useState("");
  const [fbContact, setFbContact] = useState("");
  const [fbStatus, setFbStatus] = useState(null); // null | "sending" | "sent" | "error"

  const current = VIEWS[view];

  return (
    <div className="app">
      <div className="shell">
        {view === "home" ? (
          <Home
            onGo={setView}
            onLogin={() => setLoginOpen(true)}
            onSignup={() => setSignupOpen(true)}
            onFeedback={() => {
              setFbStatus(null);
              setFeedbackOpen(true);
            }}
          />
        ) : view === "play" ? (
          <Play
            onBack={() => setView("home")}
            title={current.title}
            subtitle={current.subtitle}
          />
        ) : (
          <Placeholder
            title={current.title}
            subtitle={current.subtitle}
            onBack={() => setView("home")}
          />
        )}
      </div>

      <Modal title="Login" open={loginOpen} onClose={() => setLoginOpen(false)}>
        <div className="field">
          <label htmlFor="login-username">Username / Email</label>
          <input id="login-username" placeholder="team25@wisc.edu" autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <div className="modalActions">
          <HudButton variant="miniCancel" onClick={() => setLoginOpen(false)}>
            Cancel
          </HudButton>
          <HudButton variant="mini" onClick={() => setLoginOpen(false)}>
            Login
          </HudButton>
        </div>
      </Modal>

      <Modal title="Sign Up" open={signupOpen} onClose={() => setSignupOpen(false)}>
        <div className="field">
          <label htmlFor="su-email">Email</label>
          <input id="su-email" placeholder="you@wisc.edu" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="su-username">Username</label>
          <input id="su-username" placeholder="badgerWords123" autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="su-password">Password</label>
          <input
            id="su-password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        <div className="modalActions">
          <HudButton variant="miniCancel" onClick={() => setSignupOpen(false)}>
            Cancel
          </HudButton>
          <HudButton variant="mini" onClick={() => setSignupOpen(false)}>
            Create
          </HudButton>
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
