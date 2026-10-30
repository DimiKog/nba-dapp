/** Compact Browse metadata derived from real explorer response/filter values. */

export type BrowseMetadataInput = {
  visiblePlayers: number;
  freeAgentsInView: number;
  injuryAlertsInView: number;
  basis: "season" | "window";
  windowDays: number;
  season: string;
  cachedAt?: string | null;
};

export function browseBasisLabel(basis: "season" | "window", windowDays: number): string {
  return basis === "season" ? "Season" : `Last ${windowDays}d`;
}

/**
 * Single-line status for Browse: counts + active basis + season.
 * Does not invent metrics beyond provided values.
 */
export function formatBrowseMetadata(input: BrowseMetadataInput): string {
  const parts = [
    `${input.visiblePlayers} player${input.visiblePlayers === 1 ? "" : "s"}`,
    `${input.freeAgentsInView} free agent${input.freeAgentsInView === 1 ? "" : "s"}`,
  ];
  if (input.injuryAlertsInView > 0) {
    parts.push(
      `${input.injuryAlertsInView} injur${input.injuryAlertsInView === 1 ? "y" : "ies"}`,
    );
  }
  parts.push(browseBasisLabel(input.basis, input.windowDays));
  if (input.season) parts.push(input.season);
  return parts.join(" · ");
}

export function formatBrowseCacheHint(cachedAt: string | null | undefined): string | null {
  if (!cachedAt) return null;
  const date = new Date(cachedAt);
  if (Number.isNaN(date.getTime())) return null;
  return `Cached ${date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
