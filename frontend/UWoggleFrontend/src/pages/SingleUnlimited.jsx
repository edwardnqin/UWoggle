import Grid from "../components/ui/Grid";
import HudButton from "../components/ui/HudButton";
import { useCallback, useState, useRef } from "react";
import ScoringRuleLegend from "../components/ui/ScoringRuleLegend";
import useBoardMusic from "../hooks/useBoardMusic";

export default function SingleUnlimited({ title, subtitle, onGiveUp }) {
  const [foundWords, setFoundWords] = useState([]);
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState([]);

  const maxScore = useRef(0);
  const { playForBoard } = useBoardMusic({ shouldKeepLooping: true });

  const handleCommitWord = useCallback((word, points) => {
    setScore((currentScore) => currentScore + points);
    setFoundWords((prev) => [...prev, word]);
  }, []);

  const handleBoardReady = useCallback(({ board: nextBoard }) => {
    setBoard(nextBoard);
    playForBoard(nextBoard);
  }, [playForBoard]);

  function handleMaxScore (value) {
    maxScore.current = value;
  }

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
                  <strong>Mode:</strong> Unlimited
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

      <HudButton
        className="btn--fit"
        onClick={() =>
          {
            const maxPossibleScore = maxScore.current;
            onGiveUp?.({
            score,
            maxPossibleScore,
            foundWords,
            totalWords: foundWords.length,
            timerDuration: null,
            reason: "give_up",
            board,
            mode: "Unlimited",
          })
          }
        }
        ariaLabel="Give up"
      >
        Give Up
      </HudButton>
    </div>
  );
}
