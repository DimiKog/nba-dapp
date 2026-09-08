import { mutateWatchlist, validLeague } from "@/lib/watchlistServer";
import { authorizeFantasyRequest } from "@/lib/fantasySessionServer";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ league: string; nbaPlayerId: string }> },
) {
  const { league, nbaPlayerId: rawPlayerId } = await context.params;
  const nbaPlayerId = Number(rawPlayerId);
  if (!validLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  if (!Number.isInteger(nbaPlayerId) || nbaPlayerId <= 0) {
    return Response.json({ error: "Invalid player" }, { status: 400 });
  }

  const access = await authorizeFantasyRequest(request, league);
  if (!access.ok) return access.response;

  const response = await mutateWatchlist(
    league,
    access.identityHeaders,
    "DELETE",
    undefined,
    nbaPlayerId,
  );
  return new Response(response.body, { status: response.status });
}
