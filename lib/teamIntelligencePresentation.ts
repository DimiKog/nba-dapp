import type { FantasyTeamCategory, FantasyTeamCategoryProfile } from "./api";
import type {
  RosterMoveRecommendedStrategy,
  RosterMoveStrategyCategory,
  RosterMoveStrategyClassification,
} from "./rosterMoveTypes";

/** Local copy so unit tests do not depend on TS path aliases. */
const CATEGORY_SHORT_LABELS: Record<string, string> = {
  fg_pct: "FG%",
  three_pm: "3PTM",
  ft_pct: "FT%",
  points: "PTS",
  rebounds: "REB",
  oreb: "OREB",
  dreb: "DREB",
  assists: "AST",
  steals: "STL",
  blocks: "BLK",
  turnovers: "TO",
  assist_turnover: "A/TO",
};

function categoryShortLabel(key: string): string {
  return CATEGORY_SHORT_LABELS[key] ?? key.replaceAll("_", " ").toUpperCase();
}

export const STRATEGY_GROUP_ORDER = [
  "PROTECT",
  "TARGET",
  "FLEX",
  "PUNT_CANDIDATE",
] as const satisfies readonly RosterMoveStrategyClassification[];

export type StrategyGroupId = (typeof STRATEGY_GROUP_ORDER)[number];

export type TeamLookItem = {
  key: string;
  /** Compact display token, e.g. `AST #1` or `OREB`. */
  display: string;
};

export type StrategyGroup = {
  id: StrategyGroupId;
  /** User-facing group title (PUNT_CANDIDATE → "PUNT CANDIDATE"). */
  label: string;
  categories: RosterMoveStrategyCategory[];
};

const STRONGEST_LIMIT = 3;

function displayLabel(category: { key: string; label?: string | null }): string {
  const label = category.label?.trim();
  if (label) return label;
  return categoryShortLabel(category.key);
}

/**
 * Strongest categories from the public/SSR category profile.
 * Uses verdict === strength, ordered by league rank then z.
 */
export function selectStrongestCategories(
  profile: FantasyTeamCategoryProfile | null | undefined,
  limit = STRONGEST_LIMIT,
): TeamLookItem[] {
  if (!profile?.categories?.length) return [];
  return [...profile.categories]
    .filter((row) => row.verdict === "strength")
    .sort(compareStrongerFirst)
    .slice(0, limit)
    .map((row) => ({
      key: row.key,
      display: formatRankedLookItem(row),
    }));
}

/**
 * Needs attention = backend TARGET categories from recommended_strategy.
 * Preserves backend order. Does not recompute TARGET or use profile weaknesses.
 */
export function selectNeedsAttentionCategories(
  strategy: RosterMoveRecommendedStrategy | null | undefined,
): TeamLookItem[] {
  return (strategy?.categories ?? [])
    .filter((row) => row.classification === "TARGET" && row.key)
    .map((row) => ({
      key: row.key,
      display: displayLabel(row),
    }));
}

/**
 * PUNT candidates come only from system recommended_strategy (discovery).
 * Never derived from profile presentation alone.
 */
export function selectPuntCandidateCategories(
  strategy: RosterMoveRecommendedStrategy | null | undefined,
): TeamLookItem[] {
  return (strategy?.categories ?? [])
    .filter((row) => row.classification === "PUNT_CANDIDATE" && row.key)
    .map((row) => ({
      key: row.key,
      display: displayLabel(row),
    }));
}

/** Group backend strategy rows by classification; omit empty groups. */
export function groupRecommendedStrategy(
  strategy: RosterMoveRecommendedStrategy | null | undefined,
): StrategyGroup[] {
  const buckets = new Map<StrategyGroupId, RosterMoveStrategyCategory[]>();
  for (const id of STRATEGY_GROUP_ORDER) buckets.set(id, []);

  for (const row of strategy?.categories ?? []) {
    if (!row?.key) continue;
    const id = row.classification as StrategyGroupId;
    if (!buckets.has(id)) continue;
    buckets.get(id)!.push(row);
  }

  return STRATEGY_GROUP_ORDER
    .map((id) => ({
      id,
      label: strategyGroupLabel(id),
      categories: buckets.get(id) ?? [],
    }))
    .filter((group) => group.categories.length > 0);
}

export function strategyGroupLabel(id: StrategyGroupId): string {
  return id === "PUNT_CANDIDATE" ? "PUNT CANDIDATE" : id;
}

export function formatStrategyCategoryChip(row: RosterMoveStrategyCategory): string {
  return displayLabel(row);
}

export function formatLookItems(items: TeamLookItem[]): string {
  return items.map((item) => item.display).join(" · ");
}

function formatRankedLookItem(row: FantasyTeamCategory): string {
  const label = displayLabel(row);
  return row.league_rank != null ? `${label} #${row.league_rank}` : label;
}

function compareStrongerFirst(a: FantasyTeamCategory, b: FantasyTeamCategory): number {
  const aRank = a.league_rank ?? Number.POSITIVE_INFINITY;
  const bRank = b.league_rank ?? Number.POSITIVE_INFINITY;
  if (aRank !== bRank) return aRank - bRank;
  return (b.z ?? Number.NEGATIVE_INFINITY) - (a.z ?? Number.NEGATIVE_INFINITY);
}
