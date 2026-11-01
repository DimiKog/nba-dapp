import { authorizeFantasyRequest } from "@/lib/fantasySessionServer";
import { isRosterMoveLeagueSlug } from "@/lib/teamPageLeagues";
import {
  backendIdentityForwardHeaders,
  backendRosterMoveUrl,
  browserSafeResponseHeaders,
  DISCOVERY_BODY_FIELDS,
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
  if (body != null && (typeof body !== "object" || Array.isArray(body))) {
    return Response.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const unknown = unknownBodyFields(payload, DISCOVERY_BODY_FIELDS);
  if (unknown.length) {
    return Response.json(
      { error: `Unknown request fields: ${unknown.join(", ")}` },
      { status: 400 },
    );
  }

  const response = await fetch(
    backendRosterMoveUrl(
      BACKEND,
      league,
      access.membership.fantrax_team_id!,
      "roster-move-discovery",
    ),
    {
      method: "POST",
      cache: "no-store",
      headers: backendIdentityForwardHeaders(access.identityHeaders),
      body: JSON.stringify(payload),
    },
  ).catch(() => null);
  if (!response) {
    return Response.json(
      { error: "Roster move discovery service unavailable" },
      { status: 502 },
    );
  }
  return new Response(response.body, {
    status: response.status,
    headers: browserSafeResponseHeaders(),
  });
}
