import { scoringRules } from "../../utils/gameScoring";

export default function ScoringRuleLegend({ compact = false }) {
  return (
    <div className={`scoringLegend${compact ? " scoringLegend--compact" : ""}`} aria-label="Scoring rules">
      {scoringRules.map((rule) => (
        <div key={rule.label} className="scoringLegend__chip">
          <span className="scoringLegend__range">{rule.label}</span>
          <span className="scoringLegend__points">{rule.points} pt{rule.points > 1 ? "s" : ""}</span>
        </div>
      ))}
    </div>
  );
}
