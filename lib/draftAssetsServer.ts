import "server-only";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

export type DraftAsset = {
  id: number;
  league_slug: "ldl" | "bdb";
  draft_year: number;
  round: number;
  original_franchise: { id: string; name: string };
  current_owner: { id: string; name: string } | null;
  ownership_state: "owned" | "conditional";
  status: "active" | "consumed" | "cancelled" | "archived";
  optimistic_version: number;
  eligibility: {
    mode: "enabled" | "draft_year_only" | "disabled";
    eligible: boolean;
    reason: string;
    opens_at: string | null;
    closes_at: string | null;
    evaluated_at: string;
  };
  conditional_obligations: Array<{
    obligation_key: string;
    draft_year: number;
    round: number;
    condition_type: "best_of" | "worst_of";
    beneficiary_franchise_id: string;
    beneficiary_name: string;
    status: "unresolved" | "resolved" | "cancelled";
  }>;
  valuation: null;
};

export type DraftAssetsResponse = {
  league_slug: "ldl" | "bdb";
  rule_set: {
    fantasy_season: string;
    version: number;
    activated_at: string;
  };
  count: number;
  assets: DraftAsset[];
};

export function validDraftLeague(value: string): value is "ldl" | "bdb" {
  return value === "ldl" || value === "bdb";
}

export async function readDraftAssets(
  league: "ldl" | "bdb",
  search = "",
): Promise<Response> {
  const apiKey = process.env.FANTASY_DRAFT_PICK_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "Draft assets are not configured" },
      { status: 503 },
    );
  }
  const suffix = search ? `?${search}` : "";
  return fetch(`${BACKEND}/api/fantasy/${league}/draft-assets${suffix}`, {
    cache: "no-store",
    headers: { "X-Internal-API-Key": apiKey },
  });
}

export async function loadDraftAssets(
  league: "ldl" | "bdb",
): Promise<DraftAssetsResponse> {
  const response = await readDraftAssets(league, "eligibility=all");
  if (!response.ok) {
    throw new Error(`Draft assets returned ${response.status}`);
  }
  return response.json() as Promise<DraftAssetsResponse>;
}
