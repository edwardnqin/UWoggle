import Grid from "../components/ui/Grid";
import HudButton from "../components/ui/HudButton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ScoringRuleLegend from "../components/ui/ScoringRuleLegend";

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function SingleTimed({ timerDuration, title, subtitle, onGiveUp, onTimeUp }) {
  const initialSeconds = useMemo(() => {
    const minutes = Number(timerDuration);
    return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 300;
  }, [timerDuration]);

  const [foundWords, setFoundWords] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [board, setBoard] = useState([]);
  const [boardWordCount, setBoardWordCount] = useState(0);
  const finishedRef = useRef(false);
  const maxScore = useRef(0);

  useEffect(() => {
    if (finishedRef.current) return undefined;

    if (timeLeft <= 0) {
      finishedRef.current = true;
      onTimeUp?.({
        score,
        foundWords,
        totalWords: foundWords.length,
        timerDuration: Number(timerDuration) || 5,
        reason: "time_up",
        board,
        mode: "Timed",
      });
      return undefined;
    }

    if (boardWordCount > 0 && foundWords.length === boardWordCount) {
      finishedRef.current = true;
      onTimeUp?.({
        score,
        foundWords,
        totalWords: foundWords.length,
        timerDuration: Number(timerDuration) || 5,
        reason: "all_words_found",
        board,
        mode: "Timed",
      });
      return undefined;
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
  }, [timeLeft, score, foundWords, timerDuration, onTimeUp, board, boardWordCount]);

  const handleCommitWord = useCallback(
    (word, points) => {
      if (finishedRef.current || timeLeft <= 0) return;

      setFoundWords((prev) => [...prev, word]);
      setScore((currentScore) => currentScore + points);
    },
    [timeLeft]
  );

  const handleBoardReady = useCallback(({ board: nextBoard, totalWords }) => {
    setBoard(nextBoard);
    setBoardWordCount(totalWords);
  }, []);

    function handleMaxScore (value) {
      maxScore.current = value;
    }

  const handleGiveUp = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const maxPossibleScore = maxScore.current;
    onGiveUp?.({
      score,
      maxPossibleScore,
      foundWords,
      totalWords: foundWords.length,
      timerDuration: Number(timerDuration) || 5,
      reason: "give_up",
      board,
      mode: "Timed",
    });
  };

  return (
    <div className="screen">
      <div className="topBar"></div>

      <div className="centerStack">
        <div className="pageTitle">{title}</div>
        <div className="pageSubtitle">{subtitle}</div>

        <div className="playMain">
          <div className="playBoard">
            <Grid onCommitWord={handleCommitWord} onBoardReady={handleBoardReady} onSetMaxScore={handleMaxScore} />
          </div>

          <div className="playSidebar">
            <div className="hintCard scoreboardPanel">
              <div className="hintTitle">Game Stats</div>
              <ul className="hintList statsList">
                <li>
                  <strong>Time Left:</strong> {formatTime(timeLeft)}
                </li>
                <li>
                  <strong>Score:</strong> {score}
                </li>
                <li>
                  <strong>Words Found:</strong> {foundWords.length}
                </li>
                <li className="statsList__rules">
                  <strong>Scoring Rule</strong>
                  <ScoringRuleLegend compact />
                </li>
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
      </div>

      <HudButton className="btn--fit" onClick={handleGiveUp} ariaLabel="Give up">
        Give Up
      </HudButton>
    </div>
  );
}