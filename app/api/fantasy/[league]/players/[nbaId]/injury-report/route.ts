import { authorizeFantasyRequest, copyBackendResponse } from "@/lib/fantasySessionServer";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";
type Context = { params: Promise<{ league: string; nbaId: string }> };

async function forward(request: Request, context: Context, method: "GET" | "POST") {
  const { league, nbaId } = await context.params;
  if ((league !== "ldl" && league !== "bdb") || !/^\d{1,10}$/.test(nbaId) || Number(nbaId) < 1) {
    return Response.json({ error: "Unknown league or invalid player" }, { status: 400 });
  }
  const access = await authorizeFantasyRequest(request, league);
  if (!access.ok) return access.response;
  if (method === "POST" && !access.membership.commissioner) {
    return Response.json({ error: "Commissioner access is required" }, { status: 403 });
  }
  const headers = new Headers(access.identityHeaders);
  let body: string | undefined;
  if (method === "POST") {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Invalid injury report" }, { status: 400 });
    }
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(payload);
  }
  const response = await fetch(`${BACKEND}/api/fantasy/${league}/players/${nbaId}/injury-report`, {
    method, headers, body, cache: "no-store",
  }).catch(() => null);
  return response ? copyBackendResponse(response)
    : Response.json({ error: "Injury report service unavailable" }, { status: 502 });
}

export async function GET(request: Request, context: Context) { return forward(request, context, "GET"); }
export async function POST(request: Request, context: Context) { return forward(request, context, "POST"); }
