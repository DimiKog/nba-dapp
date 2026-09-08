import "server-only";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

export type CommissionerPlayer = {
  id: number;
  nba_id: number;
  name: string;
  position: string;
  nba_team: string;
};

export type CommissionerFranchise = {
  id: string;
  name: string;
  roster_captured_at: string | null;
  unmapped_player_count: number;
  players: CommissionerPlayer[];
};

export type CommissionerDraftPick = {
  id: number;
  draft_year: number;
  round: number;
  original_franchise: { id: string; name: string };
  current_owner: { id: string; name: string };
};

export type CompletedTradeOptions = {
  league_slug: "ldl" | "bdb";
  fantasy_season: string;
  franchises: CommissionerFranchise[];
  draft_picks: CommissionerDraftPick[];
};

export type CompletedTradeSummary = {
  public_id: string;
  fantasy_season: string;
  franchise_a_id: string;
  franchise_a_name: string;
  franchise_b_id: string;
  franchise_b_name: string;
  occurred_at: string;
  recorded_at: string;
  asset_count: number;
  external_reference: string | null;
};

export type CompletedTradeList = {
  league_slug: "ldl" | "bdb";
  count: number;
  trades: CompletedTradeSummary[];
};

export function validTradeLedgerLeague(value: string): value is "ldl" | "bdb" {
  return value === "ldl" || value === "bdb";
}

function backendHeaders(identityHeaders: HeadersInit, extra?: HeadersInit): Headers {
  const apiKey = process.env.FANTASY_TRADE_LEDGER_API_KEY?.trim();
  const headers = new Headers(identityHeaders);
  new Headers(extra).forEach((value, key) => headers.set(key, value));
  if (apiKey) headers.set("X-Internal-API-Key", apiKey);
  return headers;
}

export async function readCompletedTradeOptions(
  league: "ldl" | "bdb",
  identityHeaders: HeadersInit,
): Promise<Response> {
  if (!process.env.FANTASY_TRADE_LEDGER_API_KEY?.trim()) {
    return Response.json({ error: "Trade ledger is not configured" }, { status: 503 });
  }
  return fetch(
    `${BACKEND}/api/fantasy/${league}/commissioner/completed-trades/options`,
    { cache: "no-store", headers: backendHeaders(identityHeaders) },
  );
}

export async function readCompletedTrades(
  league: "ldl" | "bdb",
  identityHeaders: HeadersInit,
): Promise<Response> {
  if (!process.env.FANTASY_TRADE_LEDGER_API_KEY?.trim()) {
    return Response.json({ error: "Trade ledger is not configured" }, { status: 503 });
  }
  return fetch(
    `${BACKEND}/api/fantasy/${league}/commissioner/completed-trades?limit=50`,
    { cache: "no-store", headers: backendHeaders(identityHeaders) },
  );
}

export async function createCompletedTrade(
  league: "ldl" | "bdb",
  body: unknown,
  idempotencyKey: string,
  identityHeaders: HeadersInit,
  actorSubject: string,
): Promise<Response> {
  const apiKey = process.env.FANTASY_TRADE_LEDGER_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "Trade ledger write is not configured" }, { status: 503 });
  }
  return fetch(`${BACKEND}/api/fantasy/${league}/commissioner/completed-trades`, {
    method: "POST",
    cache: "no-store",
    headers: backendHeaders(identityHeaders, {
      "Content-Type": "application/json",
      "X-Commissioner-Subject": actorSubject,
      "Idempotency-Key": idempotencyKey,
    }),
    body: JSON.stringify(body),
  });
}

export async function loadCompletedTradeWorkspace(
  league: "ldl" | "bdb",
  identityHeaders: HeadersInit,
): Promise<{ options: CompletedTradeOptions; history: CompletedTradeList }> {
  const [optionsResponse, historyResponse] = await Promise.all([
    readCompletedTradeOptions(league, identityHeaders),
    readCompletedTrades(league, identityHeaders),
  ]);
  if (!optionsResponse.ok || !historyResponse.ok) {
    throw new Error("Completed-trade workspace is unavailable");
  }
  return {
    options: await optionsResponse.json() as CompletedTradeOptions,
    history: await historyResponse.json() as CompletedTradeList,
  };
}
