import { authorizeFantasyRequest } from "@/lib/fantasySessionServer";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

type PickAsset = { type?: unknown; pick_id?: unknown; from_team?: unknown };
type PackageRequest = {
  selected_team_id?: unknown;
  counterparty_team_id?: unknown;
  selected_team_sends?: unknown;
  counterparty_team_sends?: unknown;
  drops?: unknown;
  intent?: unknown;
  basis?: unknown;
  window_days?: unknown;
  assets?: unknown;
};

function validTeamId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function validPlayerIds(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length >= 1
    && value.length <= 2
    && value.every((id) => Number.isInteger(id) && id > 0)
    && new Set(value).size === value.length;
}

function validDrop(value: unknown): boolean {
  return value == null || (Number.isInteger(value) && Number(value) > 0);
}

function validAssets(value: unknown): value is PickAsset[] {
  if (!Array.isArray(value) || value.length > 4) return false;
  const counts = { selected_team: 0, counterparty_team: 0 };
  const ids = new Set<number>();
  for (const asset of value as PickAsset[]) {
    if (
      !asset || asset.type !== "draft_pick"
      || !Number.isInteger(asset.pick_id) || Number(asset.pick_id) <= 0
      || (asset.from_team !== "selected_team" && asset.from_team !== "counterparty_team")
      || ids.has(Number(asset.pick_id))
    ) return false;
    ids.add(Number(asset.pick_id));
    counts[asset.from_team] += 1;
    if (counts[asset.from_team] > 2) return false;
  }
  return true;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  const { league } = await context.params;
  if (league !== "ldl" && league !== "bdb") {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as PackageRequest | null;
  const drops = body?.drops as { selected_team?: unknown; counterparty_team?: unknown } | null;
  const windowDays = Number(body?.window_days ?? 14);
  if (
    !body
    || !validTeamId(body.selected_team_id)
    || !validTeamId(body.counterparty_team_id)
    || body.selected_team_id === body.counterparty_team_id
    || !validPlayerIds(body.selected_team_sends)
    || !validPlayerIds(body.counterparty_team_sends)
    || !drops || typeof drops !== "object" || Array.isArray(drops)
    || !validDrop(drops.selected_team) || !validDrop(drops.counterparty_team)
    || body.intent !== "balanced"
    || (body.basis !== "season" && body.basis !== "window")
    || !Number.isInteger(windowDays) || windowDays < 1 || windowDays > 30
    || !validAssets(body.assets)
  ) {
    return Response.json({ error: "Invalid manual trade-package request" }, { status: 400 });
  }

  const access = await authorizeFantasyRequest(request, league, {
    selectedTeamId: body.selected_team_id,
  });
  if (!access.ok) return access.response;
  const outgoingHeaders = new Headers(access.identityHeaders);
  outgoingHeaders.set("Content-Type", "application/json");

  const response = await fetch(`${BACKEND}/api/fantasy/${league}/trade-package-analysis`, {
    method: "POST",
    cache: "no-store",
    headers: outgoingHeaders,
    body: JSON.stringify({
      ...body,
      selected_team_id: access.membership.fantrax_team_id,
      window_days: windowDays,
    }),
  }).catch(() => null);

  if (!response) {
    return Response.json({ error: "Manual trade-package service unavailable" }, { status: 502 });
  }
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0" },
  });
}
