import { reconcileCompletedTradeRoster, validTradeLedgerLeague } from "@/lib/completedTradesServer";
import { authorizeFantasyRequest } from "@/lib/fantasySessionServer";

export async function POST(
  request: Request,
  context: { params: Promise<{ league: string; tradeId: string }> },
) {
  const { league, tradeId } = await context.params;
  if (!validTradeLedgerLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  const access = await authorizeFantasyRequest(request, league, { commissioner: true });
  if (!access.ok) return access.response;
  const response = await reconcileCompletedTradeRoster(
    league,
    tradeId,
    access.identityHeaders,
    `user:${access.session.user.id}`,
  );
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
