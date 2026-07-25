import { verifyCloudflareAccess } from "@/lib/cloudflareAccess";
import { mutateWatchlist, validLeague } from "@/lib/watchlistServer";

export async function POST(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  if (!await verifyCloudflareAccess(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { league } = await context.params;
  if (!validLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as {
    nba_player_id?: unknown;
    notes?: unknown;
    priority?: unknown;
  } | null;
  const nbaPlayerId = Number(body?.nba_player_id);
  const priority = Number(body?.priority ?? 2);
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  if (
    !Number.isInteger(nbaPlayerId)
    || nbaPlayerId <= 0
    || ![1, 2, 3].includes(priority)
    || notes.length > 2000
  ) {
    return Response.json({ error: "Invalid watchlist entry" }, { status: 400 });
  }

  const response = await mutateWatchlist(league, "POST", {
    nba_player_id: nbaPlayerId,
    notes,
    priority: priority as 1 | 2 | 3,
  });
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
