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
    const [statusMsg, setStatusMsg] = useState("Loading multiplayer game...");
    const [submitted, setSubmitted] = useState(false);
    const [polling, setPolling] = useState(true);

    const finishedRef = useRef(false);

    const loadSession = useCallback(async () => {
        if (!gameId) return;

        try {
            const { ok, data } = await getGameSession(gameId);
            if (!ok) {
                setStatusMsg(data.error || "Failed to load multiplayer game.");
                return;
            }

            setSession(data);

            if (timeLeft === null && data.timerSeconds != null) {
                setTimeLeft(data.timerSeconds);
            }
        } catch {
            setStatusMsg("Could not reach the game service.");
        }
    }, [gameId, timeLeft]);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    useEffect(() => {
        if (!polling || !gameId) return;

        const id = window.setInterval(() => {
            loadSession();
        }, 3000);

        return () => window.clearInterval(id);
    }, [polling, gameId, loadSession]);

    useEffect(() => {
        if (!session) return;

        if (session.status === "WAITING") {
            setStatusMsg("Waiting for player 2 to join...");
        } else if (session.status === "ACTIVE") {
            setStatusMsg("Game started. Find words!");
        } else if (session.status === "FINISHED") {
            setStatusMsg("Game finished.");
        }
    }, [session]);

    const handleCommitWord = useCallback(
        (word, points) => {
            if (submitted || session?.completed) return;
            setFoundWords((prev) => [...prev, word]);
            setScore((prev) => prev + points);
        },
        [submitted, session?.completed]
    );

    const handleSubmitScore = useCallback(async () => {
        if (submitted || !gameId || !playerRole) return;

        try {
            setStatusMsg("Submitting score...");
            const { ok, data } = await submitMultiplayerScore(
                gameId,
                playerRole,
                score,
                foundWords
            );

            if (!ok) {
                setStatusMsg(data.error || "Failed to submit score.");
                return;
            }

            setSubmitted(true);
            setStatusMsg("Score submitted. Waiting for other player...");
            await loadSession();
        } catch {
            setStatusMsg("Could not submit score.");
        }
    }, [submitted, gameId, playerRole, score, foundWords, loadSession]);

    useEffect(() => {
        if (!session || finishedRef.current) return;
        if (timeLeft === null) return;

        if (session.status !== "ACTIVE") return;

        if (timeLeft <= 0) {
            finishedRef.current = true;
            handleSubmitScore();
            return;
        }

        const timerId = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    window.clearInterval(timerId);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(timerId);
    }, [timeLeft, session, handleSubmitScore]);

    useEffect(() => {
        if (!session?.completed) return;
        setPolling(false);
        finishedRef.current = true;
    }, [session?.completed]);

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
                    <div className="playBoard">
                        <Grid
                            onCommitWord={handleCommitWord}
                            initialBoard={session.board}
                            initialWords={session.words}
                            skipFetch={true}
                        />
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