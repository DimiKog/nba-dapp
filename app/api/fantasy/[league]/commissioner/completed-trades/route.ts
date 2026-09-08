import { authorizeFantasyRequest } from "@/lib/fantasySessionServer";
import {
  createCompletedTrade,
  readCompletedTrades,
  validTradeLedgerLeague,
} from "@/lib/completedTradesServer";

export async function GET(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  const { league } = await context.params;
  if (!validTradeLedgerLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  const access = await authorizeFantasyRequest(request, league, { commissioner: true });
  if (!access.ok) return access.response;
  return copyResponse(await readCompletedTrades(league, access.identityHeaders));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  const { league } = await context.params;
  if (!validTradeLedgerLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  const access = await authorizeFantasyRequest(request, league, { commissioner: true });
  if (!access.ok) return access.response;
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "JSON request required" }, { status: 415 });
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) {
    return Response.json({ error: "Idempotency-Key is required" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  return copyResponse(await createCompletedTrade(
    league,
    body,
    idempotencyKey,
    access.identityHeaders,
    `user:${access.session.user.id}`,
  ));
}

function copyResponse(response: Response) {
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
