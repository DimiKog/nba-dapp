import type { FantasyCategoryTargets } from "@/lib/api";

const MARKET_LABELS = {
  strong: "meaningful statistical help",
  limited: "limited statistical help",
  weak: "weak FA market",
  no_qualifying_options: "no qualifying FA option",
} as const;

export function gnfcFaMarketSummary(targets: FantasyCategoryTargets): string {
  const recommendations = targets.category_recommendations ?? [];
  if (!recommendations.length) return "No qualifying FA recommendation for the selected needs";
  return recommendations
    .map((recommendation) => `${recommendation.label}: ${MARKET_LABELS[recommendation.free_agent_market]}`)
    .join(" · ");
}
