import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Grid from "../components/ui/Grid";
import HudButton from "../components/ui/HudButton";
import {
    getGameSession,
    submitMultiplayerScore,
} from "../services/api";

function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function MultiplayerGame({ gameId, playerRole, onBackToHome }) {
    const [session, setSession] = useState(null);
    const [foundWords, setFoundWords] = useState([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [manualStatusMsg, setManualStatusMsg] = useState(null);

    const finishedRef = useRef(false);

    const loadSession = useCallback(async () => {
        if (!gameId) return;

        try {
            const { ok, data } = await getGameSession(gameId);
            if (!ok) {
                setManualStatusMsg(data.error || "Failed to load multiplayer game.");
                return;
            }

            setSession(data);
            setTimeLeft((prev) => (prev === null && data.timerSeconds != null ? data.timerSeconds : prev));
        } catch {
            setManualStatusMsg("Could not reach the game service.");
        }
    }, [gameId]);

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
            await loadSession();
        } catch {
            setManualStatusMsg("Could not submit score.");
        }
    }, [submitted, gameId, playerRole, score, foundWords, loadSession]);

    useEffect(() => {
        const id = window.setTimeout(() => {
            void loadSession();
        }, 0);

        return () => window.clearTimeout(id);
    }, [loadSession]);

    useEffect(() => {
        if (!gameId || session?.completed) return;

        const id = window.setInterval(() => {
            void loadSession();
        }, 3000);

        return () => window.clearInterval(id);
    }, [gameId, session?.completed, loadSession]);

    useEffect(() => {
        if (!session || finishedRef.current) return;
        if (timeLeft === null) return;
        if (session.status !== "ACTIVE") return;
        if (session.completed) return;

        // Game starts here
        const timerId = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null) return prev;

                if (prev <= 1) {
                    window.clearInterval(timerId);
                    finishedRef.current = true;
                    window.setTimeout(() => {
                        void handleSubmitScore();
                    }, 0);
                    return 0;
                }

                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(timerId);
    }, [session, timeLeft, handleSubmitScore]);

    useEffect(() => {
        if (session?.completed) {
            finishedRef.current = true;
        }
    }, [session?.completed]);

    const handleCommitWord = useCallback(
        (word, points) => {
            if (submitted || session?.completed) return;
            setFoundWords((prev) => [...prev, word]);
            setScore((prev) => prev + points);
        },
        [submitted, session?.completed]
    );

    const statusMsg = useMemo(() => {
        if (manualStatusMsg) return manualStatusMsg;
        if (!session) return "Loading multiplayer game...";
        if (session.status === "WAITING") return "Waiting for player 2 to join...";
        if (session.status === "ACTIVE") return "Game started. Find words!";
        if (session.status === "FINISHED") return "Game finished.";
        return "Loading multiplayer game...";
    }, [manualStatusMsg, session]);

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
                    {session.hostName || "Host"} vs {session.guestName || "Guest"}
                </div>

                <div className="playMain">
                    {session.status === "ACTIVE" && (
                        <div className="playBoard">
                            <Grid
                                onCommitWord={handleCommitWord}
                                initialBoard={session.board}
                                initialWords={session.words}
                                skipFetch={true}
                            />
                        </div>
                    )}

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
                                <li><strong>Host Score:</strong> {session.hostScore ?? "—"}</li>
                                <li><strong>Guest Score:</strong> {session.guestScore ?? "—"}</li>
                            </ul>
                        </div>

                        <div className="hintCard foundWordsPanel">
                            <div className="hintTitle">Found Words ({foundWords.length})</div>
                            {foundWords.length === 0 ? (
                                <div className="pageSubtitle">No words yet.</div>
                            ) : (
                                <ul className="hintList foundWordsList">
                                    {foundWords.map((w) => (
                                        <li key={w}>{w}</li>
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