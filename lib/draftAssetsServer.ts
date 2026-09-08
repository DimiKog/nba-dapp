import "server-only";

import type { DraftAssetsResponse } from "@/lib/draftAssetTypes";

export type { DraftAsset, DraftAssetsResponse } from "@/lib/draftAssetTypes";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

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
