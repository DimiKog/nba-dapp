import type { FantasyWatchlistEntry } from "./api";
import type { AvailabilityLeagueSlug } from "./availabilityLeagues";

export type WatchlistPriority = 1 | 2 | 3;

/** Preserve product semantics: high priority first, then most recently updated. */
export function sortWatchlistEntries(entries: FantasyWatchlistEntry[]): FantasyWatchlistEntry[] {
  return [...entries].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return Date.parse(b.updated_at) - Date.parse(a.updated_at);
  });
}

export async function upsertWatchlistEntry(
  league: AvailabilityLeagueSlug,
  input: {
    nbaPlayerId: number;
    notes?: string;
    priority?: WatchlistPriority;
  },
): Promise<Response> {
  return fetch(`/api/watchlist/${league}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nba_player_id: input.nbaPlayerId,
      notes: input.notes ?? "",
      priority: input.priority ?? 2,
    }),
  });
}

export async function removeWatchlistEntry(
  league: AvailabilityLeagueSlug,
  nbaPlayerId: number,
): Promise<Response> {
  return fetch(`/api/watchlist/${league}/${nbaPlayerId}`, {
    method: "DELETE",
  });
}

export function priorityLabel(priority: WatchlistPriority): string {
  if (priority === 1) return "High";
  if (priority === 3) return "Low";
  return "Medium";
}
