import HudButton from "../components/ui/HudButton";

function formatWords(words) {
  if (!Array.isArray(words) || words.length === 0) return "None";
  return words.join(", ");
}

export default function EndScreen({ title, subtitle, onReturn, gameStats }) {
  const score = gameStats?.score ?? 0;
  const totalWords = gameStats?.totalWords ?? 0;
  const timerDuration = gameStats?.timerDuration ?? null;
  const reason = gameStats?.reason === "give_up" ? "Ended early" : "Time ran out";
  const foundWords = Array.isArray(gameStats?.foundWords) ? gameStats.foundWords : [];

  return (
    <div className="screen">
      <div className="topBar"></div>

      <div className="centerStack">
        <div className="pageTitle">{title}</div>
        <div className="pageSubtitle">{subtitle}</div>

        <div className="hintCard">
          <div className="hintTitle">Game Summary</div>
          <ul className="hintList">
            <li><strong>Result:</strong> {reason}</li>
            {timerDuration ? <li><strong>Mode:</strong> {timerDuration} minute timed game</li> : null}
            <li><strong>Final Score:</strong> {score}</li>
            <li><strong>Total Words Found:</strong> {totalWords}</li>
            <li><strong>Scoring Rule:</strong> 1 point per word</li>
            <li><strong>Words:</strong> {formatWords(foundWords)}</li>
          </ul>
        </div>
      </div>

      <HudButton
        className="btn--fit"
        ariaLabel="Go back to Home Screen"
        onClick={onReturn}
      >
        Return
      </HudButton>
    </div>
  );
}
