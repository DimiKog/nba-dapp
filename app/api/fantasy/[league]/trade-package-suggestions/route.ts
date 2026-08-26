const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

type PackageSuggestionRequest = {
  selected_team_id?: unknown;
  outgoing_player_id?: unknown;
  intent?: unknown;
  basis?: unknown;
  window_days?: unknown;
  limit?: unknown;
  partner_team_id?: unknown;
};

function validTeamId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  const { league } = await context.params;
  if (league !== "ldl" && league !== "bdb") {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as PackageSuggestionRequest | null;
  const outgoingPlayerId = Number(body?.outgoing_player_id);
  const windowDays = Number(body?.window_days ?? 14);
  const limit = Number(body?.limit ?? 6);
  const partnerTeamId = body?.partner_team_id;

  if (
    !body
    || !validTeamId(body.selected_team_id)
    || !Number.isInteger(outgoingPlayerId)
    || outgoingPlayerId <= 0
    || body.intent !== "balanced"
    || (body.basis !== "season" && body.basis !== "window")
    || !Number.isInteger(windowDays)
    || windowDays < 1
    || windowDays > 30
    || !Number.isInteger(limit)
    || limit < 1
    || limit > 12
    || (partnerTeamId != null && !validTeamId(partnerTeamId))
  ) {
    return Response.json({ error: "Invalid automatic trade-package suggestion request" }, { status: 400 });
  }

  const response = await fetch(`${BACKEND}/api/fantasy/${league}/trade-package-suggestions`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selected_team_id: body.selected_team_id,
      outgoing_player_id: outgoingPlayerId,
      intent: body.intent,
      basis: body.basis,
      window_days: windowDays,
      limit,
      ...(partnerTeamId ? { partner_team_id: partnerTeamId } : {}),
    }),
  }).catch(() => null);

  if (!response) {
    return Response.json({ error: "Automatic trade-package suggestion service unavailable" }, { status: 502 });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
