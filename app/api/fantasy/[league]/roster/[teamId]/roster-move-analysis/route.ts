import { authorizeFantasyRequest } from "@/lib/fantasySessionServer";
import { isRosterMoveLeagueSlug } from "@/lib/teamPageLeagues";
import {
  ANALYSIS_BODY_FIELDS,
  backendIdentityForwardHeaders,
  backendRosterMoveUrl,
  browserSafeResponseHeaders,
  unknownBodyFields,
  validRosterMoveTeamId,
} from "@/lib/rosterMoveBff";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

export async function POST(
  request: Request,
  context: { params: Promise<{ league: string; teamId: string }> },
) {
  const { league, teamId } = await context.params;
  if (!isRosterMoveLeagueSlug(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  if (!validRosterMoveTeamId(teamId)) {
    return Response.json({ error: "Invalid team" }, { status: 400 });
  }

  const access = await authorizeFantasyRequest(request, league, {
    selectedTeamId: teamId,
  });
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const unknown = unknownBodyFields(payload, ANALYSIS_BODY_FIELDS);
  if (unknown.length) {
    return Response.json(
      { error: `Unknown request fields: ${unknown.join(", ")}` },
      { status: 400 },
    );
  }
  if (
    !Number.isInteger(payload.remove_nba_id)
    || !Number.isInteger(payload.add_nba_id)
    || Number(payload.remove_nba_id) <= 0
    || Number(payload.add_nba_id) <= 0
  ) {
    return Response.json(
      { error: "positive remove_nba_id and add_nba_id are required" },
      { status: 400 },
    );
  }

  const response = await fetch(
    backendRosterMoveUrl(
      BACKEND,
      league,
      access.membership.fantrax_team_id!,
      "roster-move-analysis",
    ),
    {
      method: "POST",
      cache: "no-store",
      headers: backendIdentityForwardHeaders(access.identityHeaders),
      body: JSON.stringify({
        remove_nba_id: payload.remove_nba_id,
        add_nba_id: payload.add_nba_id,
        ...(payload.basis != null ? { basis: payload.basis } : {}),
      }),
    },
  ).catch(() => null);
  if (!response) {
    return Response.json(
      { error: "Roster move analysis service unavailable" },
      { status: 502 },
    );
  }
  return new Response(response.body, {
    status: response.status,
    headers: browserSafeResponseHeaders(),
  });
}
