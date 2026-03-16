export const scoringRules = [
  { label: "3-4 letters", points: 1 },
  { label: "5 letters", points: 2 },
  { label: "6 letters", points: 3 },
  { label: "7 letters", points: 5 },
  { label: "8+ letters", points: 6 },
];

export function getWordScore(word) {
  const len = String(word ?? "").trim().length;
  if (len <= 4) return 1;
  if (len === 5) return 2;
  if (len === 6) return 3;
  if (len === 7) return 5;
  return 6;
}

export function scoringRuleText() {
  return scoringRules.map((rule) => `${rule.label}: ${rule.points}`).join(", ");
}
