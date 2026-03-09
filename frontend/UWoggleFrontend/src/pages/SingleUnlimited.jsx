import Grid from "../components/ui/Grid";
import HudButton from "../components/ui/HudButton";
import { useState } from "react";

export default function SingleUnlimited({ title, subtitle, onGiveUp }) {
  const [foundWords, setFoundWords] = useState([]);

  const handleCommitWord = (word) => {
    const w = word.toUpperCase().trim();
    if (w.length < 3) return;
    setFoundWords((prev) => (prev.includes(w) ? prev : [...prev, w]));
  };

//   Missing a Scoreboard component
  return (
    <div className="screen">
      <div className="topBar">
      </div>

      <div className="centerStack">
        <div className="pageTitle">{title}</div>
        <div className="pageSubtitle">{subtitle}</div>

        <div className="playMain">
          <div className="playBoard">
            <Grid onCommitWord={handleCommitWord} />
          </div>

          <div className="hintCard foundWordsPanel">
            <div className="hintTitle">Found Words</div>
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

       <HudButton className="btn--fit" onClick={onGiveUp} ariaLabel="Give up">
          Give Up
        </HudButton>
    </div>
  );
}