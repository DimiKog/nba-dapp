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

export function roleEvidenceSummary(actionability: NonNullable<FantasyTargetCandidate["actionability"]>): string {
  if (actionability.role_signal === "not_assessed") {
    return "Role has not been assessed for this statistical-only candidate.";
  }
  const evidence = actionability.role_evidence;
  const season = evidence?.season ?? actionability.stats_season;
  const games = evidence?.games ?? actionability.observed_games;
  const minutes = evidence?.minutes ?? actionability.observed_minutes;
  const sample = season && typeof games === "number"
    ? `${season} · ${games} GP${typeof minutes === "number" ? ` · ${minutes.toFixed(1)} min/game` : ""}. `
    : "";
  if (evidence?.scope === "historical" || actionability.role_signal === "historical_only") {
    return `${sample}${evidence?.finding === "limited_observed_minutes" ? "Limited past minutes. " : ""}Current role is unverified; this is not a projection.`;
  }
  if (evidence?.finding === "limited_observed_minutes" || actionability.role_signal === "limited_observed_minutes") {
    return `${sample}Observed minutes are limited; check the expected role.`;
  }
  if (evidence?.finding === "observed_rotation_minutes" || actionability.role_signal === "observed_current_minutes") {
    return `${sample}Current minutes meet the observed-role threshold, not a future guarantee.`;
  }
  return `${sample}Not enough current games to establish a role.`;
}
