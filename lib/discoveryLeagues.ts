import type { LeagueSlug } from "./leagues";

/** Leagues supported by the Player Discovery workspace (includes GNFC). */
export const DISCOVERY_LEAGUE_SLUGS = ["ldl", "bdb", "gnfc"] as const;
export type DiscoveryLeagueSlug = (typeof DISCOVERY_LEAGUE_SLUGS)[number];

const DISCOVERY_LEAGUE_LABELS: Record<DiscoveryLeagueSlug, string> = {
  ldl: "LDL",
  bdb: "BδB",
  gnfc: "GNFC",
};

export function isDiscoveryLeagueSlug(
  value: string | null | undefined,
): value is DiscoveryLeagueSlug {
  return value === "ldl" || value === "bdb" || value === "gnfc";
}

/**
 * Parse a Discovery league from a query value.
 * Returns null for missing/unknown values — never maps GNFC to LDL.
 */
export function parseDiscoveryLeagueSlug(
  value: string | null | undefined,
): DiscoveryLeagueSlug | null {
  return isDiscoveryLeagueSlug(value) ? value : null;
}

/**
 * Resolve the active Discovery league from the URL, falling back to the
 * legacy LDL/BδB stored preference when the URL has no valid Discovery league.
 * An explicit `gnfc` URL value is always preserved.
 */
export function resolveDiscoveryLeague(
  urlValue: string | null | undefined,
  storedLegacyLeague: LeagueSlug,
): DiscoveryLeagueSlug {
  const parsed = parseDiscoveryLeagueSlug(urlValue);
  if (parsed) return parsed;
  return storedLegacyLeague;
}

export function discoveryLeagueLabel(league: DiscoveryLeagueSlug): string {
  return DISCOVERY_LEAGUE_LABELS[league];
}

/** True when Browse can mount the existing LDL/BδB Player Explorer. */
export function isExplorerLeagueSlug(league: DiscoveryLeagueSlug): league is LeagueSlug {
  return league === "ldl" || league === "bdb";
}
