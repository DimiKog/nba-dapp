import type { DiscoveryLeagueSlug } from "./discoveryLeagues";

export const DISCOVERY_VIEWS = ["browse", "fit", "watched", "fa-trends"] as const;
export type DiscoveryView = (typeof DISCOVERY_VIEWS)[number];

export const DISCOVERY_VIEW_LABELS: Record<DiscoveryView, string> = {
  browse: "Browse",
  fit: "Fit to my plan",
  watched: "Watched",
  "fa-trends": "FA trends",
};

export function isDiscoveryView(value: string | null | undefined): value is DiscoveryView {
  return value === "browse"
    || value === "fit"
    || value === "watched"
    || value === "fa-trends";
}

/** Invalid or missing view falls back to Browse. */
export function parseDiscoveryView(value: string | null | undefined): DiscoveryView {
  return isDiscoveryView(value) ? value : "browse";
}

export type DiscoveryHrefOptions = {
  league?: string | null | DiscoveryLeagueSlug;
  view?: DiscoveryView | string | null;
  team?: string | null;
};

/**
 * Build a canonical Discovery workspace href.
 * Preserves an explicit league query string when provided (including gnfc).
 */
export function buildDiscoveryHref(options: DiscoveryHrefOptions = {}): string {
  const params = new URLSearchParams();
  const view = parseDiscoveryView(options.view ?? "browse");
  if (view !== "browse") params.set("view", view);

  if (typeof options.league === "string" && options.league.length > 0) {
    params.set("league", options.league);
  }
  if (typeof options.team === "string" && options.team.length > 0) {
    params.set("team", options.team);
  }

  const query = params.toString();
  return query ? `/players?${query}` : "/players";
}

/** Watchlist compatibility redirect target. */
export function buildWatchlistRedirectHref(league: string | null | undefined): string {
  return buildDiscoveryHref({
    view: "watched",
    league: typeof league === "string" && league.length > 0 ? league : null,
  });
}
