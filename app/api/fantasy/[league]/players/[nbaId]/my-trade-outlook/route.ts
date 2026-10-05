import { authorizeFantasyRequest, copyBackendResponse } from "@/lib/fantasySessionServer";
import { isLeagueSlug } from "@/lib/leagues";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

type Context = { params: Promise<{ league: string; nbaId: string }> };

async function forward(request: Request, context: Context, method: "GET" | "PUT" | "DELETE") {
  const { league, nbaId } = await context.params;
  if (!isLeagueSlug(league) || !/^\d{1,10}$/.test(nbaId) || Number(nbaId) < 1) {
    return Response.json({ error: "Unknown league or invalid player" }, { status: 400 });
  }
  const access = await authorizeFantasyRequest(request, league);
  if (!access.ok) return access.response;
  const headers = new Headers(access.identityHeaders);
  let body: string | undefined;
  if (method === "PUT") {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Invalid outlook" }, { status: 400 });
    }
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(payload);
  }
  const response = await fetch(`${BACKEND}/api/fantasy/${league}/players/${nbaId}/my-trade-outlook`, {
    method, headers, body, cache: "no-store",
  }).catch(() => null);
  return response
    ? copyBackendResponse(response)
    : Response.json({ error: "Private outlook service unavailable" }, { status: 502 });
}

export async function GET(request: Request, context: Context) { return forward(request, context, "GET"); }
export async function PUT(request: Request, context: Context) { return forward(request, context, "PUT"); }
export async function DELETE(request: Request, context: Context) { return forward(request, context, "DELETE"); }
