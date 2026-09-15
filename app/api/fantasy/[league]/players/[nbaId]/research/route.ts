import { authorizeFantasyRequest } from "@/lib/fantasySessionServer";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";
const ALLOWED_PARAMS = new Set(["days", "limit"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ league: string; nbaId: string }> },
) {
  const { league, nbaId } = await context.params;
  if ((league !== "ldl" && league !== "bdb") || !/^\d{1,10}$/.test(nbaId)) {
    return Response.json({ error: "Unknown league or invalid player" }, { status: 400 });
  }
  const incoming = new URL(request.url).searchParams;
  if ([...incoming.keys()].some((key) => !ALLOWED_PARAMS.has(key))) {
    return Response.json({ error: "Unsupported parameter" }, { status: 400 });
  }
  const access = await authorizeFantasyRequest(request, league);
  if (!access.ok) return access.response;
  const response = await fetch(
    `${BACKEND}/api/nba/players/by-nba-id/${nbaId}/research?${incoming}`,
    { cache: "no-store", headers: access.identityHeaders },
  ).catch(() => null);
  if (!response) {
    return Response.json({ error: "Player research service unavailable" }, { status: 502 });
  }
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0" },
  });
}
