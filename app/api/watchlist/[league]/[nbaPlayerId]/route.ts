import { verifyCloudflareAccess } from "@/lib/cloudflareAccess";
import { mutateWatchlist, validLeague } from "@/lib/watchlistServer";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ league: string; nbaPlayerId: string }> },
) {
  if (!await verifyCloudflareAccess(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { league, nbaPlayerId: rawPlayerId } = await context.params;
  const nbaPlayerId = Number(rawPlayerId);
  if (!validLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  if (!Number.isInteger(nbaPlayerId) || nbaPlayerId <= 0) {
    return Response.json({ error: "Invalid player" }, { status: 400 });
  }

  const response = await mutateWatchlist(
    league,
    "DELETE",
    undefined,
    nbaPlayerId,
  );
  return new Response(response.body, { status: response.status });
}
