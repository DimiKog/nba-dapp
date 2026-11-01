/**
 * Leagues that use the shared FantasyRosterPage / Team Intelligence shell.
 * Includes GNFC — identity must stay explicit (never remapped to LDL/BδB).
 *
 * Kept self-contained (no value imports) so Node unit tests can load it
 * without path-alias / extension resolution.
 */
export const TEAM_PAGE_LEAGUE_SLUGS = ["ldl", "bdb", "gnfc"] as const;
export type TeamPageLeagueSlug = (typeof TEAM_PAGE_LEAGUE_SLUGS)[number];

const STANDINGS_LABELS: Record<TeamPageLeagueSlug, string> = {
  ldl: "LDL Standings",
  bdb: "BδB Standings",
  gnfc: "GNFC Γ5 standings",
};

export function isTeamPageLeagueSlug(
  value: string | null | undefined,
): value is TeamPageLeagueSlug {
  return value === "ldl" || value === "bdb" || value === "gnfc";
}

/** Roster-move BFF + client discovery: same set as team pages. */
export function isRosterMoveLeagueSlug(
  value: string | null | undefined,
): value is TeamPageLeagueSlug {
  return isTeamPageLeagueSlug(value);
}

export type TeamPageCapabilities = {
  showCap: boolean;
  showPayroll: boolean;
  showTradeAnalyze: boolean;
  showCategoryStrategyLink: boolean;
  showSalaryInFallbackRoster: boolean;
  usesAvailabilityGate: boolean;
  brandEyebrow: string | null;
  ownerLabel: string;
  standingsHref: string;
  standingsLabel: string;
};

/**
 * League capability flags for the shared Team shell.
 * Prefer these over duplicated GNFC-only page components.
 */
export function teamPageCapabilities(league: TeamPageLeagueSlug): TeamPageCapabilities {
  const isGnfc = league === "gnfc";
  return {
    showCap: !isGnfc,
    showPayroll: !isGnfc,
    showTradeAnalyze: !isGnfc,
    showCategoryStrategyLink: !isGnfc,
    showSalaryInFallbackRoster: !isGnfc,
    usesAvailabilityGate: isGnfc,
    brandEyebrow: isGnfc ? "GNFC Γ5 · roster" : null,
    ownerLabel: isGnfc ? "Fantrax owner" : "Owner",
    standingsHref: `/fantasy/${league}`,
    standingsLabel: STANDINGS_LABELS[league],
  };
}
