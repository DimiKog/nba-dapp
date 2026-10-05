import "server-only";
import type { LeagueSlug } from "@/lib/leagues";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

export async function readWatchlist(
  league: LeagueSlug,
  identityHeaders: HeadersInit,
  windowDays = 7,
): Promise<Response> {
  return fetch(
    `${BACKEND}/api/fantasy/${league}/watchlist?window=${windowDays}`,
    { cache: "no-store", headers: identityHeaders },
  );
}

export async function mutateWatchlist(
  league: LeagueSlug,
  identityHeaders: HeadersInit,
  method: "POST" | "DELETE",
  body?: {
    nba_player_id: number;
    notes: string;
    priority: 1 | 2 | 3;
  },
  nbaPlayerId?: number,
): Promise<Response> {
  const suffix = method === "DELETE" ? `/${nbaPlayerId}` : "";
  const headers = new Headers(identityHeaders);
  if (body) headers.set("Content-Type", "application/json");
  return fetch(`${BACKEND}/api/fantasy/${league}/watchlist${suffix}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}
