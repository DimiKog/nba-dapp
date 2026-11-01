import type { LeagueSlug } from "./leagues";

/**
 * Leagues that Player Detail can hold as fantasy context.
 * Includes GNFC. Intentionally separate from legacy LEAGUE_SLUGS storage.
 */
export const PLAYER_DETAIL_LEAGUE_SLUGS = ["ldl", "bdb", "gnfc"] as const;
export type PlayerDetailLeagueSlug = (typeof PLAYER_DETAIL_LEAGUE_SLUGS)[number];

const PLAYER_DETAIL_LEAGUE_LABELS: Record<PlayerDetailLeagueSlug, string> = {
  ldl: "LDL",
  bdb: "BδB",
  gnfc: "GNFC",
};

export function isPlayerDetailLeagueSlug(
  value: string | null | undefined,
): value is PlayerDetailLeagueSlug {
  return value === "ldl" || value === "bdb" || value === "gnfc";
}

export function parsePlayerDetailLeagueSlug(
  value: string | null | undefined,
): PlayerDetailLeagueSlug | null {
  return isPlayerDetailLeagueSlug(value) ? value : null;
}

export function playerDetailLeagueLabel(league: PlayerDetailLeagueSlug): string {
  return PLAYER_DETAIL_LEAGUE_LABELS[league];
}

/** LDL/BDB-only surfaces on Player Detail (Outlook, commissioner injury edit). */
export function isPlayerDetailOutlookLeague(
  league: PlayerDetailLeagueSlug | null | undefined,
): league is LeagueSlug {
  return league === "ldl" || league === "bdb";
}
