import type { FantasyCategoryTargets, FantasyTargetCandidate } from "./api";

/** A home shortcut must never promote statistical fit into an immediate add. */
export function selectReadyFreeAgent(targets: FantasyCategoryTargets): FantasyTargetCandidate | null {
  const ready = (candidate: FantasyTargetCandidate) =>
    candidate.availability === "free_agent" && candidate.actionability?.status === "ready";
  const direct = targets.candidates.find((candidate) => ready(candidate) && candidate.recommendation_tier === "strong")
    ?? targets.candidates.find((candidate) => ready(candidate) && candidate.recommendation_tier === "best_available");
  if (direct) return direct;

  for (const lane of targets.category_recommendations ?? []) {
    const candidate = lane.strong_free_agents.find(ready);
    if (candidate) return candidate;
  }
  for (const lane of targets.category_recommendations ?? []) {
    const candidate = lane.best_available.find(ready);
    if (candidate) return candidate;
  }
  return null;
}
