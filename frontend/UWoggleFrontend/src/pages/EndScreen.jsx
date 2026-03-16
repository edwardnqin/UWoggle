import HudButton from "../components/ui/HudButton";
import ScoringRuleLegend from "../components/ui/ScoringRuleLegend";

function formatWords(words) {
  if (!Array.isArray(words) || words.length === 0) return "None";
  return words.join(", ");
}

function formatReason(reason, timerDuration) {
  if (reason === "all_words_found") return "All words found";
  if (reason === "time_up") return "Time ran out";
  if (reason === "give_up") {
    return timerDuration ? "Ended early" : "Ended by player";
  }
  return "Game ended";
}

function formatMode(timerDuration) {
  return timerDuration ? `${timerDuration} minute timed game` : "Unlimited mode";
}

export default function EndScreen({ title, subtitle, onReturn, gameStats }) {
  const score = gameStats?.score ?? 0;
  const totalWords = gameStats?.totalWords ?? 0;
  const timerDuration = gameStats?.timerDuration ?? null;
  const reason = formatReason(gameStats?.reason, timerDuration);
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
            <li><strong>Mode:</strong> {formatMode(timerDuration)}</li>
            <li><strong>Final Score:</strong> {score}</li>
            <li><strong>Total Words Found:</strong> {totalWords}</li>
            <li className="statsList__rules"><strong>Scoring Rule</strong><ScoringRuleLegend /></li>
            <li><strong>Words:</strong> {formatWords(foundWords)}</li>
          </ul>
        </div>
      </div>

      <HudButton className="btn--fit" ariaLabel="Go back to Home Screen" onClick={onReturn}>
        Return
      </HudButton>
    </div>
  );
}
