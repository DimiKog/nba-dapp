import { authorizeFantasyRequest, copyBackendResponse } from "@/lib/fantasySessionServer";
import {
  readTeamCategoryStrategy,
  writeTeamCategoryStrategy,
} from "@/lib/teamCategoryStrategyServer";

function validLeague(league: string): league is "ldl" | "bdb" {
  return league === "ldl" || league === "bdb";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  const { league } = await context.params;
  if (!validLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  const access = await authorizeFantasyRequest(request, league);
  if (!access.ok) return access.response;
  return copyBackendResponse(
    await readTeamCategoryStrategy(league, access.identityHeaders),
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  const { league } = await context.params;
  if (!validLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid strategy" }, { status: 400 });
  }
  const access = await authorizeFantasyRequest(request, league);
  if (!access.ok) return access.response;
  return copyBackendResponse(
    await writeTeamCategoryStrategy(league, access.identityHeaders, body),
  );
}
