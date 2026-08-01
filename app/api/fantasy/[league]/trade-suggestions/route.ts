const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

type TradeSuggestionRequest = {
  selected_team_id?: unknown;
  outgoing_player_id?: unknown;
  intent?: unknown;
  basis?: unknown;
  window_days?: unknown;
  limit_per_team?: unknown;
  constraints?: unknown;
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

  const body = await request.json().catch(() => null) as TradeSuggestionRequest | null;
  const outgoingPlayerId = Number(body?.outgoing_player_id);
  const windowDays = Number(body?.window_days ?? 14);
  const limitPerTeam = Number(body?.limit_per_team ?? 3);
  const constraints = body?.constraints ?? {};

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
    || !Number.isInteger(limitPerTeam)
    || limitPerTeam < 1
    || limitPerTeam > 10
    || typeof constraints !== "object"
    || constraints === null
    || Array.isArray(constraints)
  ) {
    return Response.json({ error: "Invalid trade suggestion request" }, { status: 400 });
  }

  const response = await fetch(`${BACKEND}/api/fantasy/${league}/trade-suggestions`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selected_team_id: body.selected_team_id,
      outgoing_player_id: outgoingPlayerId,
      intent: body.intent,
      basis: body.basis,
      window_days: windowDays,
      limit_per_team: limitPerTeam,
      constraints,
    }),
  }).catch(() => null);

  if (!response) {
    return Response.json({ error: "Trade suggestion service unavailable" }, { status: 502 });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
