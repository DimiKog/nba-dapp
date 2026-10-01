import type { PlayerIntelligenceSample } from "./api";

export function overallDetail(sample: PlayerIntelligenceSample, kind: "nba" | "market"): string {
  const score = sample.overall?.z_score;
  if (score == null) {
    return sample.qualified ? "No combined neutral score" : "No combined impact yet";
  }
  if (kind === "market") return "Ranked within availability market";
  return `Combined impact · ${score > 0 ? "+" : ""}${score.toFixed(2)} z`;
}
