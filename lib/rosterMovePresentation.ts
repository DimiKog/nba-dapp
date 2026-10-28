import type {
  RosterMoveDiscovery,
  RosterMoveMeaningfulTransition,
  RosterMoveRecommendation,
  RosterMovePairFeasibilityStatus,
} from "./rosterMoveTypes";

/** Keep labels local so unit tests do not depend on TS path/extension resolution. */
const CATEGORY_SHORT_LABELS: Record<string, string> = {
  fg_pct: "FG%",
  three_pm: "3PTM",
  ft_pct: "FT%",
  points: "PTS",
  rebounds: "REB",
  oreb: "OREB",
  dreb: "DREB",
  assists: "AST",
  steals: "ST",
  blocks: "BLK",
  turnovers: "TO",
  assist_turnover: "A/TO",
};

/**
 * UI presentation order when flattening discovery `tiers` into a single list.
 *
 * Backend discovery ranks moves only within each strategic tier; it does not
 * define a global cross-tier ranking. This order is deliberate presentation
 * policy: keep each tier's `returned` array as-is (no re-score/re-sort), walk
 * strategic tiers first, then economically unverified, then `other` before
 * `blocked` (blocked is less actionable). Do not describe the flattened list
 * as a canonical backend/global ranking.
 */
export const DISCOVERY_TIER_ORDER = [
  "tier_1_target_ready",
  "tier_2_target_needs_review",
  "tier_3_target_protect_tradeoff",
  "tier_economically_unverified",
  "tier_other",
  "tier_blocked",
] as const;

export const INITIAL_RECOMMENDATION_COUNT = 3;

/** Shared with CategoryNeedsFinder semantics where codes overlap. */
export const ACQUISITION_REASON_LABELS: Record<string, string> = {
  current_role_unverified: "Verify role",
  historical_limited_minutes: "Limited minutes in the historical sample",
  limited_current_minutes: "Current observed minutes are limited",
  nba_role_or_status_unverified: "Verify NBA status",
  injury_review_required: "Check injury/status",
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
  roster_illegal: "Roster change is not legal",
  cap_exceeded: "Would exceed the salary cap",
};

const FEASIBILITY_LABELS: Record<RosterMovePairFeasibilityStatus, string> = {
  feasible: "Ready to consider",
  needs_review: "Promising · Review details",
  economically_unverified: "Verify salary",
  blocked: "Not currently viable",
};

const PRIORITY_REVIEW_REASONS = [
  "injury_review_required",
  "current_role_unverified",
  "nba_role_or_status_unverified",
  "limited_current_minutes",
  "cap_provisional",
  "cap_unavailable",
  "salary_unavailable",
  "roster_snapshot_stale_or_unverified",
] as const;

export function flattenDiscoveryRecommendations(
  discovery: RosterMoveDiscovery | null | undefined,
): RosterMoveRecommendation[] {
  if (!discovery?.tiers) return [];
  const out: RosterMoveRecommendation[] = [];
  const seen = new Set<string>();
  for (const tier of DISCOVERY_TIER_ORDER) {
    const returned = discovery.tiers[tier]?.returned ?? [];
    for (const move of returned) {
      const key = recommendationKey(move);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(move);
    }
  }
  // Append any unexpected tier keys after DISCOVERY_TIER_ORDER; still no re-sort.
  for (const [tier, payload] of Object.entries(discovery.tiers)) {
    if ((DISCOVERY_TIER_ORDER as readonly string[]).includes(tier)) continue;
    for (const move of payload?.returned ?? []) {
      const key = recommendationKey(move);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(move);
    }
  }
  return out;
}

export function recommendationKey(move: RosterMoveRecommendation): string {
  return `${move.remove_player?.nba_id ?? "x"}:${move.add_player?.nba_id ?? "y"}`;
}

export function visibleRecommendations(
  moves: RosterMoveRecommendation[],
  expanded: boolean,
  limit = INITIAL_RECOMMENDATION_COUNT,
): RosterMoveRecommendation[] {
  if (expanded || moves.length <= limit) return moves;
  return moves.slice(0, limit);
}

export function pairFeasibilityLabel(
  status: string | null | undefined,
): string {
  if (!status) return "Review details";
  return FEASIBILITY_LABELS[status as RosterMovePairFeasibilityStatus]
    ?? "Review details";
}

export function acquisitionReasonLabel(code: string): string {
  return ACQUISITION_REASON_LABELS[code] ?? humanizeCode(code);
}

export function primaryReviewLabels(move: RosterMoveRecommendation): string[] {
  const reasons = [
    ...(move.pair_feasibility?.reasons ?? []),
    ...(move.add_player?.actionability?.reasons ?? []),
  ];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const code of PRIORITY_REVIEW_REASONS) {
    if (!reasons.includes(code)) continue;
    const label = acquisitionReasonLabel(code);
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels.slice(0, 2);
}

export function headlineStatus(move: RosterMoveRecommendation): string {
  const status = move.pair_feasibility?.status;
  const reviews = primaryReviewLabels(move);
  if (status === "feasible" && reviews.length === 0) {
    return "Ready to consider";
  }
  if (status === "feasible") {
    return `Ready to consider · ${reviews[0]}`;
  }
  if (status === "needs_review") {
    if (reviews.length) return `Promising · ${reviews[0]}`;
    return "Promising · Review details";
  }
  if (status === "economically_unverified") return "Verify salary";
  if (status === "blocked") return "Not currently viable";
  return pairFeasibilityLabel(status);
}

export function categoryShortLabel(key: string): string {
  return CATEGORY_SHORT_LABELS[key] ?? key.toUpperCase();
}

export type TargetImpactDisplay = {
  key: string;
  label: string;
  /** True when league position improved (numerically lower rank). */
  improved: boolean;
  beforeRank: number | null;
  afterRank: number | null;
  /** Absolute place change when known from rank_delta or before/after. */
  places: number | null;
  /** Compact single-line fallback when ranks are incomplete. */
  fallbackLine: string;
};

function transitionRanks(transition: RosterMoveMeaningfulTransition): {
  beforeRank: number | null;
  afterRank: number | null;
} {
  const before =
    transition.before_league_rank
    ?? transition.before?.league_rank
    ?? null;
  const after =
    transition.after_league_rank
    ?? transition.after?.league_rank
    ?? null;
  return {
    beforeRank: typeof before === "number" ? before : null,
    afterRank: typeof after === "number" ? after : null,
  };
}

/**
 * Format TARGET impacts for recommendation cards.
 *
 * rank_delta semantics (backend): before_rank - after_rank.
 * Positive delta => gained places; negative => lost places.
 * Before/after ranks are shown only when both are present factually.
 */
export function targetImpactDisplays(
  move: RosterMoveRecommendation,
): TargetImpactDisplay[] {
  const improved = new Set(move.target?.improved ?? []);
  if (!improved.size) return [];
  const byKey = new Map(
    (move.meaningful_transitions ?? [])
      .filter((row) => row.classification === "TARGET" || improved.has(row.key))
      .map((row) => [row.key, row]),
  );
  return [...improved].map((key) => {
    const transition = byKey.get(key);
    const label = categoryShortLabel(key);
    const { beforeRank, afterRank } = transition
      ? transitionRanks(transition)
      : { beforeRank: null, afterRank: null };
    const rankDelta = transition?.rank_delta;
    let places: number | null = null;
    if (beforeRank != null && afterRank != null) {
      places = beforeRank - afterRank;
    } else if (typeof rankDelta === "number" && rankDelta !== 0) {
      places = rankDelta;
    }
    const didImprove = places != null ? places > 0 : true;
    const absPlaces = places != null ? Math.abs(places) : null;
    let fallbackLine = `${label} improved`;
    if (absPlaces != null && absPlaces > 0) {
      fallbackLine = didImprove
        ? `${label} · +${absPlaces} ${absPlaces === 1 ? "place" : "places"}`
        : `${label} · −${absPlaces} ${absPlaces === 1 ? "place" : "places"}`;
    }
    return {
      key,
      label,
      improved: didImprove,
      beforeRank,
      afterRank,
      places: absPlaces,
      fallbackLine,
    };
  });
}

/** @deprecated Prefer targetImpactDisplays for structured UI. */
export function targetImprovementLines(
  move: RosterMoveRecommendation,
): string[] {
  return targetImpactDisplays(move).map((row) => {
    if (row.beforeRank != null && row.afterRank != null && row.places != null) {
      const placeBit = row.improved
        ? `+${row.places} ${row.places === 1 ? "place" : "places"}`
        : `−${row.places} ${row.places === 1 ? "place" : "places"}`;
      return `${row.label} #${row.beforeRank} → #${row.afterRank} · ${placeBit}`;
    }
    return row.fallbackLine;
  });
}

/** Compact games cue for card status rows (e.g. "3 GP"). */
export function compactObservedGames(move: RosterMoveRecommendation): string | null {
  const games = move.add_player?.observed?.games;
  if (typeof games !== "number") return null;
  return `${games} GP`;
}

export function protectDamageLabel(move: RosterMoveRecommendation): string {
  const damaged = move.protect?.damaged ?? [];
  if (!damaged.length) return "No PROTECT categories damaged";
  return `PROTECT damaged: ${damaged.map(categoryShortLabel).join(", ")}`;
}

export function hasProtectDamage(move: RosterMoveRecommendation): boolean {
  return (move.protect?.damaged ?? []).length > 0;
}

export function observedGamesLabel(move: RosterMoveRecommendation): string | null {
  const games = move.add_player?.observed?.games;
  if (typeof games !== "number") return null;
  const basis = move.add_player?.contribution_basis?.resolution;
  if (games === 0) {
    return basis === "previous_only"
      ? "0 GP · previous-season sample"
      : "0 current-season GP";
  }
  if (basis === "blended" || basis === "early_season_linear_blend_v1") {
    return `${games} GP · limited current-season sample`;
  }
  return `${games} GP`;
}

export function salaryDeltaLabel(move: RosterMoveRecommendation): string | null {
  const cap = move.salary_cap;
  if (!cap?.applies) return null;
  if (cap.verified === false && cap.delta == null) {
    return cap.reason ? acquisitionReasonLabel(cap.reason) : "Salary impact unverified";
  }
  if (typeof cap.delta !== "number") return null;
  return `Salary ${formatMoneyDelta(cap.delta)}`;
}

export function formatMoneyDelta(delta: number): string {
  const millions = delta / 1_000_000;
  const abs = Math.abs(millions);
  const formatted = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
  if (delta === 0) return "$0";
  if (delta < 0) return `−$${formatted}M`;
  return `+$${formatted}M`;
}

export function humanizeCode(code: string): string {
  return code.replaceAll("_", " ");
}

export function isRawEngineCode(text: string): boolean {
  return /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(text);
}
