import "server-only";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

export function validLeague(value: string): value is "ldl" | "bdb" {
  return value === "ldl" || value === "bdb";
}

export async function readWatchlist(
  league: "ldl" | "bdb",
  windowDays = 7,
): Promise<Response> {
  return fetch(
    `${BACKEND}/api/fantasy/${league}/watchlist?window=${windowDays}`,
    { cache: "no-store" },
  );
}

export async function mutateWatchlist(
  league: "ldl" | "bdb",
  method: "POST" | "DELETE",
  body?: {
    nba_player_id: number;
    notes: string;
    priority: 1 | 2 | 3;
  },
  nbaPlayerId?: number,
): Promise<Response> {
  const apiKey = process.env.FANTASY_WATCHLIST_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "Watchlist writes are not configured" },
      { status: 503 },
    );
  }
  const suffix = method === "DELETE" ? `/${nbaPlayerId}` : "";
  return fetch(`${BACKEND}/api/fantasy/${league}/watchlist${suffix}`, {
    method,
    headers: {
      "X-Internal-API-Key": apiKey,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}
