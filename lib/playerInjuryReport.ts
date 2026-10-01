export type ReviewedInjuryReport = {
  status: "injured" | "recovering" | "available";
  summary: string;
  sourceUrl: string;
  sourceDate: string;
  expectedReturnDate: string;
  recordedAt: string;
};

export type InjuryReportDraft = Omit<ReviewedInjuryReport, "recordedAt">;
export const INJURY_REPORT_UPDATED = "player-injury-report-updated";

function path(league: "ldl" | "bdb", nbaId: number) {
  return `/api/fantasy/${league}/players/${nbaId}/injury-report`;
}

async function readResponse(response: Response): Promise<ReviewedInjuryReport | null> {
  const payload = await response.json().catch(() => null) as { report?: ReviewedInjuryReport | null; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || "Injury report unavailable");
  return payload?.report ?? null;
}

export async function fetchInjuryReport(league: "ldl" | "bdb", nbaId: number, signal?: AbortSignal) {
  return readResponse(await fetch(path(league, nbaId), { cache: "no-store", signal }));
}

export async function saveInjuryReport(league: "ldl" | "bdb", nbaId: number, draft: InjuryReportDraft) {
  return readResponse(await fetch(path(league, nbaId), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft), cache: "no-store",
  }));
}
