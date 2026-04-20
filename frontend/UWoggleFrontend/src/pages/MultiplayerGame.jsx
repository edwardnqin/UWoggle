import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Grid from "../components/ui/Grid";
import HudButton from "../components/ui/HudButton";
import {
  getGameSession,
  getGameWebSocketUrl,
  submitMultiplayerScore,
  updateMultiplayerProgress,
} from "../services/api";

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds ?? 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getScoreForRole(session, playerRole) {
  if (!session) return 0;
  return playerRole === "HOST" ? session.hostScore ?? 0 : session.guestScore ?? 0;
}

function getWordsForRole(session, playerRole) {
  if (!session) return [];
  return playerRole === "HOST"
    ? session.hostFoundWords ?? []
    : session.guestFoundWords ?? [];
}

function getSubmittedForRole(session, playerRole) {
  if (!session) return false;
  return playerRole === "HOST"
    ? Boolean(session.hostSubmitted)
    : Boolean(session.guestSubmitted);
}

function computeTimeLeft(session) {
  if (!session) return null;
  if (session.completed) return 0;
  if (session.status !== "ACTIVE") return session.timerSeconds ?? 0;
  if (!session.startedAt) return session.timerSeconds ?? 0;

  const startedAtMs = new Date(session.startedAt).getTime();
  if (Number.isNaN(startedAtMs)) return session.timerSeconds ?? 0;

  const endAtMs = startedAtMs + (session.timerSeconds ?? 0) * 1000;
  return Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000));
}

export default function MultiplayerGame({ gameId, playerRole, onBackToHome }) {
  const [session, setSession] = useState(null);
  const [foundWords, setFoundWords] = useState([]);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [manualStatusMsg, setManualStatusMsg] = useState(null);

  // ── Local countdown state (replaces useMemo) ──────────────────────────────
  const [timeLeft, setTimeLeft] = useState(null);

  const wsRef = useRef(null);
  const autoSubmittedRef = useRef(false);

  const loadSession = useCallback(async () => {
    if (!gameId) return;

    try {
      const { ok, data } = await getGameSession(gameId);
      if (!ok) {
        setManualStatusMsg(data.error || "Failed to load multiplayer game.");
        return;
      }

      setSession(data);
      setScore(getScoreForRole(data, playerRole));
      setFoundWords(getWordsForRole(data, playerRole));
      setSubmitted(getSubmittedForRole(data, playerRole));
    } catch {
      setManualStatusMsg("Could not reach the game service.");
    }
  }, [gameId, playerRole]);

  const handleSubmitScore = useCallback(async () => {
    if (submitted || !gameId || !playerRole) return;

    try {
      setManualStatusMsg("Submitting score...");
      const { ok, data } = await submitMultiplayerScore(
        gameId,
        playerRole,
        score,
        foundWords
      );

      if (!ok) {
        setManualStatusMsg(data.error || "Failed to submit score.");
        return;
      }

      setSubmitted(true);
      setManualStatusMsg("Score submitted. Waiting for other player...");
      setSession(data);
    } catch {
      setManualStatusMsg("Could not submit score.");
    }
  }, [submitted, gameId, playerRole, score, foundWords]);

  const handleLiveProgress = useCallback(
    async (nextScore, nextWords) => {
      if (!gameId || !playerRole) return;

      try {
        const { ok, data } = await updateMultiplayerProgress(
          gameId,
          playerRole,
          nextScore,
          nextWords
        );

        if (!ok) {
          setManualStatusMsg(data.error || "Failed to update live score.");
        }
      } catch {
        setManualStatusMsg("Could not send live score update.");
      }
    },
    [gameId, playerRole]
  );

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      if (cancelled) return;
      await loadSession();
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, [loadSession]);

  // ── Poll server every 2 seconds for game state updates ───────────────────
  useEffect(() => {
    if (!gameId || session?.completed) return;

    const id = window.setInterval(() => {
      void loadSession();
    }, 2000);

    return () => window.clearInterval(id);
  }, [gameId, session?.completed, loadSession]);

  // ── WebSocket for real-time updates ──────────────────────────────────────
  useEffect(() => {
    if (!gameId) return;

    const socket = new WebSocket(getGameWebSocketUrl(gameId));
    wsRef.current = socket;

    socket.onopen = () => {
      setManualStatusMsg(null);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type !== "GAME_UPDATE" || !message.payload) {
          return;
        }

        const nextSession = message.payload;
        setSession(nextSession);
        setSubmitted(getSubmittedForRole(nextSession, playerRole));

        const serverWords = getWordsForRole(nextSession, playerRole);
        const serverScore = getScoreForRole(nextSession, playerRole);

        setFoundWords((prev) =>
          serverWords.length >= prev.length ? serverWords : prev
        );
        setScore((prev) => Math.max(prev, serverScore));
      } catch {
        setManualStatusMsg("Received an invalid game update.");
      }
    };

    socket.onerror = () => {
      setManualStatusMsg("WebSocket connection error.");
    };

    socket.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [gameId, playerRole]);

  // ── Local countdown: sync from server, then tick down every 1 second ─────
  useEffect(() => {
    if (!session || session.status !== "ACTIVE" || session.completed) {
      setTimeLeft(computeTimeLeft(session));
      return;
    }

    // Sync to accurate server time whenever session updates
    setTimeLeft(computeTimeLeft(session));

    // Tick down locally every 1 second — smooth display independent of polling
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [session]);

  // ── Auto-submit when time runs out ────────────────────────────────────────
  useEffect(() => {
    if (!session || session.completed) {
      if (session?.completed) {
        autoSubmittedRef.current = true;
      }
      return;
    }

    const timerId = window.setInterval(() => {
      const next = computeTimeLeft(session);

      if (next === 0 && !autoSubmittedRef.current && !submitted) {
        autoSubmittedRef.current = true;
        void handleSubmitScore();
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [session, submitted, handleSubmitScore]);

  const handleCommitWord = useCallback(
    (word, points) => {
      if (!session || submitted || session.completed) return;

      if (session.status !== "ACTIVE") {
        setManualStatusMsg("Waiting for both players to join.");
        return;
      }

      if (foundWords.includes(word)) {
        setManualStatusMsg(`"${word}" was already found.`);
        return;
      }

      const nextWords = [...foundWords, word];
      const nextScore = score + points;

      setFoundWords(nextWords);
      setScore(nextScore);
      setManualStatusMsg(null);

      void handleLiveProgress(nextScore, nextWords);
    },
    [session, submitted, foundWords, score, handleLiveProgress]
  );

  const statusMsg = useMemo(() => {
    if (manualStatusMsg) return manualStatusMsg;
    if (!session) return "Loading multiplayer game...";
    if (session.status === "WAITING") return "Waiting for player 2 to join...";
    if (session.status === "ACTIVE" && submitted) return "Score submitted. Waiting for other player...";
    if (session.status === "ACTIVE") return "Game started. Find words!";
    if (session.status === "FINISHED") return "Game finished.";
    return "Loading multiplayer game...";
  }, [manualStatusMsg, session, submitted]);

  const winnerText = useMemo(() => {
    if (!session?.completed) return null;
    if (session.winnerSlot === "TIE") return "It's a tie!";
    if (session.winnerSlot === playerRole) return "You win!";
    return "You lose.";
  }, [session, playerRole]);

  if (!session) {
    return (
      <div className="screen">
        <div className="topBar">
          <HudButton variant="miniGhost" onClick={onBackToHome}>
            ← Back
          </HudButton>
        </div>
        <div className="centerStack">
          <div className="pageTitle">Multiplayer Game</div>
          <div className="pageSubtitle">{statusMsg}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="topBar">
        <HudButton variant="miniGhost" onClick={onBackToHome}>
          ← Back
        </HudButton>
      </div>

      <div className="centerStack">
        <div className="pageTitle">Multiplayer Game</div>
        <div className="pageSubtitle">
          {session.hostName || "Host"} vs {session.guestName || "Waiting for player 2"}
        </div>

        <div className="playMain">
          <div className="playBoard">
            {session.status === "ACTIVE" &&
            <Grid
              onCommitWord={handleCommitWord}
              initialBoard={session.board}
              initialWords={session.words}
              skipFetch={true}
              disabled={session.status !== "ACTIVE" || submitted || session.completed}
              alreadyFoundWords={foundWords}
            />}
          </div>

          <div className="playSidebar">
            <div className="hintCard scoreboardPanel">
              <div className="hintTitle">Game Stats</div>
              <ul className="hintList statsList">
                <li><strong>Your Role:</strong> {playerRole}</li>
                <li><strong>Status:</strong> {session.status}</li>
                <li><strong>Game ID:</strong> {session.gameId}</li>
                <li><strong>Join Code:</strong> {session.joinCode}</li>
                <li><strong>Time Left:</strong> {formatTime(timeLeft ?? session.timerSeconds ?? 0)}</li>
                <li><strong>Your Score:</strong> {score}</li>
                <li><strong>Your Words:</strong> {foundWords.length}</li>
                <li><strong>Host Score:</strong> {session.hostScore ?? 0}</li>
                <li><strong>Guest Score:</strong> {session.guestScore ?? 0}</li>
                <li><strong>Host Submitted:</strong> {session.hostSubmitted ? "Yes" : "No"}</li>
                <li><strong>Guest Submitted:</strong> {session.guestSubmitted ? "Yes" : "No"}</li>
              </ul>
            </div>

            <div className="hintCard foundWordsPanel">
              <div className="hintTitle">Found Words ({foundWords.length})</div>
              {foundWords.length === 0 ? (
                <div className="pageSubtitle">No words yet.</div>
              ) : (
                <ul className="hintList foundWordsList">
                  {foundWords.map((w, index) => (
                    <li key={`${w}-${index}`}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="modalHint">{statusMsg}</div>

        {session.completed && (
          <div className="hintCard" style={{ minWidth: 360 }}>
            <div className="hintTitle">Result</div>
            <p><strong>Host Score:</strong> {session.hostScore ?? 0}</p>
            <p><strong>Guest Score:</strong> {session.guestScore ?? 0}</p>
            <p><strong>Winner:</strong> {session.winnerSlot}</p>
            <p><strong>Your Result:</strong> {winnerText}</p>
          </div>
        )}

        {!session.completed && !submitted && (
          <HudButton className="btn--fit" onClick={handleSubmitScore}>
            Submit Score
          </HudButton>
        )}
      </div>
    </div>
  );
}