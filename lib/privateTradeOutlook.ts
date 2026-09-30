export type PrivateTradeOutlook = {
  assessment: "unresolved" | "positive" | "neutral" | "concern";
  availability: "unresolved" | "low" | "moderate" | "high";
  upside: "unresolved" | "limited" | "steady" | "high";
  note: string;
  sourceUrl: string;
  sourceDate: string;
  savedAt: string | null;
};

export const EMPTY_PRIVATE_OUTLOOK: PrivateTradeOutlook = {
  assessment: "unresolved", availability: "unresolved", upside: "unresolved",
  note: "", sourceUrl: "", sourceDate: "", savedAt: null,
};

export const PRIVATE_OUTLOOK_UPDATED = "trade-advisor-private-outlook-updated";

function path(league: "ldl" | "bdb", nbaId: number): string {
  return `/api/fantasy/${league}/players/${nbaId}/my-trade-outlook`;
}

async function readResponse(response: Response): Promise<PrivateTradeOutlook | null> {
  const payload = await response.json().catch(() => null) as { brief?: PrivateTradeOutlook | null; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || "Private outlook unavailable");
  return payload?.brief ?? null;
}

export async function fetchPrivateOutlook(league: "ldl" | "bdb", nbaId: number, signal?: AbortSignal) {
  return readResponse(await fetch(path(league, nbaId), { cache: "no-store", signal }));
}

export async function savePrivateOutlook(league: "ldl" | "bdb", nbaId: number, brief: PrivateTradeOutlook) {
  const { savedAt: _savedAt, ...body } = brief;
  void _savedAt;
  return readResponse(await fetch(path(league, nbaId), {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  }));
}

export async function deletePrivateOutlook(league: "ldl" | "bdb", nbaId: number) {
  return readResponse(await fetch(path(league, nbaId), { method: "DELETE", cache: "no-store" }));
}
