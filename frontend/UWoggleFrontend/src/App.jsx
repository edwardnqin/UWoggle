import React, { useState } from "react";
import "./App.css";

import Home from "./pages/Home";
import Placeholder from "./pages/Placeholder";
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

  const current = VIEWS[view];

  return (
    <div className="app">
      <div className="shell">
        {view === "home" ? (
          <Home
            onGo={setView}
            onLogin={() => setLoginOpen(true)}
            onSignup={() => setSignupOpen(true)}
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
          <input id="login-username" placeholder="milos@wisc.edu" autoComplete="username" />
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
    </div>
  );
}
