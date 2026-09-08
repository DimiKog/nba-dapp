import { authorizeFantasyRequest } from "@/lib/fantasySessionServer";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";
const ALLOWED_PARAMS = new Set([
  "outgoing_nba_id",
  "incoming_nba_id",
  "basis",
  "window",
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ league: string; teamId: string }> },
) {
  const { league, teamId } = await context.params;
  if ((league !== "ldl" && league !== "bdb") || !validTeamId(teamId)) {
    return Response.json({ error: "Unknown league or invalid team" }, { status: 400 });
  }
  const incoming = new URL(request.url).searchParams;
  if ([...incoming.keys()].some((key) => !ALLOWED_PARAMS.has(key))) {
    return Response.json({ error: "Unsupported parameter" }, { status: 400 });
  }
  const access = await authorizeFantasyRequest(request, league, {
    selectedTeamId: teamId,
  });
  if (!access.ok) return access.response;
  const response = await fetch(
    `${BACKEND}/api/fantasy/${league}/roster/${encodeURIComponent(access.membership.fantrax_team_id!)}/trade-analysis?${incoming}`,
    { cache: "no-store", headers: access.identityHeaders },
  ).catch(() => null);
  if (!response) {
    return Response.json({ error: "Trade analysis service unavailable" }, { status: 502 });
  }
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0" },
  });
}

function validTeamId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}
