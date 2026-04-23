import { useState } from "react";
import HudButton from "../components/ui/HudButton";
import MultiplayerTimerSelect from "../components/multiplayer/MultiplayerTimerSelect";
import { DEFAULT_MULTIPLAYER_TIMER_SECONDS } from "../components/multiplayer/multiplayerTimerOptions";
import {
  createMultiplayerGame,
  joinMultiplayerGame,
  getGameSession,
} from "../services/api";

export default function MultiplayerLobby({
  onBack,
  onEnterGame,
  onOpenLogin,
  onOpenSignup,
  user,
}) {
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_MULTIPLAYER_TIMER_SECONDS);
  const [hostName, setHostName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateGame() {
    setLoading(true);
    setMessage("");

    try {
      const { ok, data } = await createMultiplayerGame(timerSeconds, user?.username || hostName || "Host");
      if (!ok) {
        setMessage(data.error || "Failed to create multiplayer game.");
        return;
      }

      const gameResp = await getGameSession(data.gameId);
      if (!gameResp.ok) {
        setMessage("Game created, but failed to load session.");
        return;
      }

      localStorage.setItem("multiplayerRole", "HOST");
      localStorage.setItem("multiplayerGameId", String(data.gameId));

      const merged = { ...data, ...gameResp.data };
      setSession(merged);
      setMessage("Multiplayer game created successfully.");

      onEnterGame?.(data.gameId, "HOST");
    } catch {
      setMessage("Could not reach the game service.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinGame() {
    if (!joinCodeInput.trim()) {
      setMessage("Please enter a join code.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const joinResp = await joinMultiplayerGame(joinCodeInput.trim(), user?.username || guestName || "Guest");
      if (!joinResp.ok) {
        setMessage(joinResp.data.error || "Failed to join game.");
        return;
      }

      const gameResp = await getGameSession(joinResp.data.gameId);
      if (!gameResp.ok) {
        setMessage(gameResp.data.error || "Joined game, but failed to load session.");
        return;
      }

      localStorage.setItem("multiplayerRole", "GUEST");
      localStorage.setItem("multiplayerGameId", String(joinResp.data.gameId));

      const merged = { ...joinResp.data, ...gameResp.data };
      setSession(merged);
      setMessage("Joined multiplayer game successfully.");

      onEnterGame?.(joinResp.data.gameId, "GUEST");
    } catch {
      setMessage("Could not reach the game service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="topBar">
        <HudButton variant="miniGhost" onClick={onBack}>
          ← Back
        </HudButton>
      </div>

      <div className="centerStack">
        <div className="pageTitle">Multiplayer</div>
        <div className="pageSubtitle">
          {user
            ? "Create a game, share the code, and play 1v1 online."
            : "You can still create or join a game as a guest. Sign in when you want a fuller account-based experience."}
        </div>

        {!user && (
          <div className="hintCard" style={{ minWidth: 360 }}>
            <div className="hintTitle">Playing as Guest</div>
            <ul className="hintList">
              <li>You can create or join a multiplayer game with a temporary name.</li>
              <li>Guest play is supported for quick 1v1 games.</li>
              <li>Log in or sign up if you want account-based features later.</li>
            </ul>
            <div className="hintCardActions">
              <HudButton variant="mini" onClick={onOpenLogin}>
                Log In
              </HudButton>
              <HudButton variant="mini" onClick={onOpenSignup}>
                Sign Up
              </HudButton>
            </div>
          </div>
        )}

        <div className="hintCard" style={{ minWidth: 360 }}>
          <div className="hintTitle">Create Multiplayer Game</div>

          {user ? 
          <>
            Your username: {user.username}
          </> : 
          <input
            type="text"
            placeholder="Your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            style={{ marginTop: 12, padding: 8, width: "100%" }}
          />
          }

          <MultiplayerTimerSelect
            value={timerSeconds}
            onChange={setTimerSeconds}
            id="lobby-multiplayer-timer"
          />

          <div style={{ marginTop: 16 }}>
            <HudButton onClick={handleCreateGame}>
              {loading ? "Creating..." : "Create Multiplayer Game"}
            </HudButton>
          </div>
        </div>

        <div className="hintCard" style={{ minWidth: 360 }}>
          <div className="hintTitle">Join Multiplayer Game</div>

          {user ? 
          <>
            Your username: {user.username}
          </> : 
          <input
            type="text"
            placeholder="Your name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            style={{ marginTop: 12, padding: 8, width: "100%" }}
          />
          }

          <input
            type="text"
            placeholder="Enter join code"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            style={{ marginTop: 12, padding: 8, width: "100%" }}
          />

          <div style={{ marginTop: 16 }}>
            <HudButton onClick={handleJoinGame}>
              {loading ? "Joining..." : "Join Game"}
            </HudButton>
          </div>
        </div>

        {message && <div className="modalHint">{message}</div>}

        {session && (
          <div className="hintCard" style={{ minWidth: 420 }}>
            <div className="hintTitle">Current Session</div>
            <p><strong>Game ID:</strong> {session.gameId}</p>
            <p><strong>Join Code:</strong> {session.joinCode}</p>
            <p><strong>Host:</strong> {session.hostName ?? "Host"}</p>
            <p><strong>Guest:</strong> {session.guestName ?? "Waiting for player 2"}</p>
          </div>
        )}
      </div>
    </div>
  );
}