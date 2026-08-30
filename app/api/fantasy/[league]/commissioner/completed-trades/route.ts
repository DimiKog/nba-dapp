import { verifyCloudflareAccess } from "@/lib/cloudflareAccess";
import {
  createCompletedTrade,
  readCompletedTrades,
  validTradeLedgerLeague,
} from "@/lib/completedTradesServer";

export async function GET(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  if (!await verifyCloudflareAccess(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { league } = await context.params;
  if (!validTradeLedgerLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  return copyResponse(await readCompletedTrades(league));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  if (!await verifyCloudflareAccess(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { league } = await context.params;
  if (!validTradeLedgerLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
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
  return copyResponse(await createCompletedTrade(league, body, idempotencyKey));
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
