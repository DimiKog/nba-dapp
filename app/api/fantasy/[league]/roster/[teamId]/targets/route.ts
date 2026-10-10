import { authorizeFantasyRequest } from "@/lib/fantasySessionServer";
import { isAvailabilityLeagueSlug } from "@/lib/availabilityLeagues";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

const ALLOWED_PARAMS = [
  "basis",
  "window",
  "availability",
  "position",
  "category",
  "limit",
  "action_scope",
  "cap_scope",
] as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ league: string; teamId: string }> },
) {
  const { league, teamId } = await context.params;
  if (!isAvailabilityLeagueSlug(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(teamId)) {
    return Response.json({ error: "Invalid team" }, { status: 400 });
  }
  const access = await authorizeFantasyRequest(request, league, {
    selectedTeamId: teamId,
  });
  if (!access.ok) return access.response;

  const incoming = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of ALLOWED_PARAMS) {
    const value = incoming.get(key);
    if (value) params.set(key, value);
  }

  const response = await fetch(
    `${BACKEND}/api/fantasy/${league}/roster/${encodeURIComponent(access.membership.fantrax_team_id!)}/targets?${params}`,
    { cache: "no-store", headers: access.identityHeaders },
  ).catch(() => null);
  if (!response) {
    return Response.json({ error: "Recommendation service unavailable" }, { status: 502 });
  }
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
