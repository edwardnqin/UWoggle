import Grid from "../components/ui/Grid";
import HudButton from "../components/ui/HudButton";
import { useState } from "react";

export default function SingleUnlimited({ title, subtitle, onGiveUp }) {
  const [foundWords, setFoundWords] = useState([]);
  const [maxScore, setMaxScore] = useState(0);

  const handleCommitWord = (word, points) => {
    const w = word.toUpperCase().trim();
    const p = Number(points) || 0;

    if (w.length < 3) return;

    setFoundWords((prev) => {
      if (prev.some((entry) => entry.word === w)) return prev;
      return [...prev, { word: w, points: p }];
    });
  };

  const totalScore = foundWords.reduce((sum, entry) => sum + entry.points, 0);

  console.log("rendered maxScore:", maxScore);

  return (
    <div className="screen">
      <div className="topBar"></div>

      <div className="centerStack">
        <div className="pageTitle">{title}</div>
        <div className="pageSubtitle">{subtitle}</div>

        <div className="playMain">
          <div className="playBoard">
            <Grid
              onCommitWord={handleCommitWord}
              onBoardLoaded={({ maxScore }) => {
                console.log("callback maxScore:", maxScore);
                setMaxScore(maxScore || 0);
              }}
            />
          </div>

          <div className="hintCard foundWordsPanel">
            <div className="hintTitle">
              Scoreboard {totalScore}/{maxScore}
            </div>

            {foundWords.length === 0 ? (
              <div className="pageSubtitle">No words yet.</div>
            ) : (
              <ul className="hintList foundWordsList">
                {foundWords.map((entry) => (
                  <li key={entry.word} className="scoreRow">
                    <span>{entry.word}</span>
                    <strong>+{entry.points}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <HudButton className="btn--fit" onClick={onGiveUp} ariaLabel="Give up">
        Give Up
      </HudButton>
    </div>
  );
}