import type { FantasyCategoryTargets, FantasyTargetCandidate } from "./api";

const ACTIONABILITY_REASON_LABELS: Record<string, string> = {
  current_role_unverified: "Current minutes and role unverified",
  historical_limited_minutes: "Limited minutes in the historical sample",
  limited_current_minutes: "Current observed minutes are limited",
  nba_role_or_status_unverified: "NBA status unverified",
  injury_review_required: "Injury needs review",
  roster_drop_required: "Roster spot or drop needed",
  roster_limit_unknown: "Roster limit unknown",
  roster_snapshot_stale_or_unverified: "Roster snapshot needs refreshing",
  roster_salary_unavailable: "A roster salary is missing",
  cap_provisional: "Cap figure is provisional",
  salary_unavailable: "Player salary unknown",
  cap_unavailable: "Cap figure unavailable",
  cap_move_required: "Cap space or salary move needed",
  claim_budget_unverified: "Claim-token balance unverified",
  claim_budget_stale_or_unverified: "Claim-token balance needs refreshing",
  claim_tokens_required: "Claim tokens needed",
  category_fit_not_actionable: "Statistical fit below the action threshold",
};

/** Map a backend actionability reason code to concise product copy. */
export function formatActionabilityReason(code: string): string {
  return ACTIONABILITY_REASON_LABELS[code] ?? code.replaceAll("_", " ");
}

/**
 * One concise reason for Fit cards when the candidate is not straightforwardly
 * actionable. Prefer the first backend reason; do not invent new rules.
 */
export function primaryActionabilityReason(
  actionability: NonNullable<FantasyTargetCandidate["actionability"]> | null | undefined,
): string | null {
  if (!actionability || actionability.status === "ready") return null;
  const code = actionability.reasons.find((reason) => typeof reason === "string" && reason.length > 0);
  return code ? formatActionabilityReason(code) : null;
}

export type ProvisionalSampleEvidence = {
  sampleGames: number;
  sampleWeight: number;
  fullWeightGames: number;
  weightPercent: number;
};

/**
 * Backend-provided early-season sample discount for Fit evidence.
 * Returns null when the payload does not indicate a provisional weight.
 */
export function provisionalSampleEvidence(
  explanation: FantasyTargetCandidate["fit_explanation"] | null | undefined,
): ProvisionalSampleEvidence | null {
  if (!explanation) return null;
  const sampleWeight = explanation.sample_weight;
  if (typeof sampleWeight !== "number" || !(sampleWeight >= 0) || sampleWeight >= 1) {
    return null;
  }
  const fullWeightGames = explanation.full_weight_games;
  if (typeof fullWeightGames !== "number" || fullWeightGames <= 0) return null;
  return {
    sampleGames: explanation.sample_games,
    sampleWeight,
    fullWeightGames,
    weightPercent: Math.round(sampleWeight * 100),
  };
}

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
