/** Shared validation helpers for roster-move BFF routes (unit-tested). */

export function validRosterMoveTeamId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

export const DISCOVERY_BODY_FIELDS = [
  "basis",
  "focus_categories",
  "actionable_only",
  "max_unique_fas",
  "max_results",
] as const;

export const ANALYSIS_BODY_FIELDS = [
  "remove_nba_id",
  "add_nba_id",
  "basis",
] as const;

export function unknownBodyFields(
  body: Record<string, unknown>,
  allowed: readonly string[],
): string[] {
  const allowedSet = new Set(allowed);
  return Object.keys(body).filter((key) => !allowedSet.has(key)).sort();
}

export function backendRosterMoveUrl(
  backend: string,
  league: string,
  teamId: string,
  action: "roster-move-discovery" | "roster-move-analysis",
): string {
  return `${backend}/api/fantasy/${league}/roster/${encodeURIComponent(teamId)}/${action}`;
}

/** Headers sent to the backend — never returned to the browser response. */
export function backendIdentityForwardHeaders(
  identityHeaders: Headers,
): Record<string, string> {
  return {
    ...Object.fromEntries(identityHeaders.entries()),
    "Content-Type": "application/json",
  };
}

export function browserSafeResponseHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, max-age=0",
  };
}

export function identitySecretsLeakInBody(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const text = JSON.stringify(payload).toLowerCase();
  return (
    text.includes("x-fantasy-identity-key")
    || text.includes("fantasy_identity_api_key")
    || text.includes("identity-key")
  );
}
