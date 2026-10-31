import { createServer } from "node:http";
import { createPrivateKey, createPublicKey, sign } from "node:crypto";

const issuer = "http://127.0.0.1:3101";
const audience = "e2e-audience";
const keyId = "e2e-access-key";
// This is a test-only key. It must stay stable across processes because the app
// deliberately caches Cloudflare's public JWKs between production builds/runs.
const privateKey = createPrivateKey(`-----BEGIN PRIVATE KEY-----
MIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQDwifvmai7hWwia
EyzglSjXPlvtgulY1S5pSn/wz1fsllntyGnm/hc2WWU7PHi+bkx2ToU6LayyegIb
h2uIm4eEw9t4v9q6UIxvO0DT8zJLklDRBWBBWtwxyvc2m1v1883M5DJUz7l8rrh+
euDhboe09zZPhaUKtV5mUERugLHDmR48gSLGI8P65DyI3so0NVw0owPBbA6SiZEK
3spel+oeAivXNieADlqsrOSUAe21vCUi5HnfLvYPODBRHvbKbbufMyCRAxXDsj5W
+4Ecp8lXfmUULwLCPKQviMGhJ57NMk7NZc7O3UPgJLK2fRu/N8iGeKX9f4bbJiTU
IKxmaNVFAgMBAAECggEAO0D+fvMC0+xhONVG7ZcI7ccUjbR9R68SRQk/baKiKeua
wR7o6aiHrtGERLyfkOeqac1rd9q3C2tPWBk6tfb8QgoeZ0c5ukJr6d26mUu0RNYJ
FwiAPvFDQ3fYgMjyNSsnNBU1yds2+f4vgCbEfXwFLaDlbd8B+lqV49Xbma4VvFUi
SaGoqSmEiD+8OZlh5h7OOl0ks8Od7hRlwHQMZBuZ5EPLxjc2BEf4UGdLFROK+Fgd
yrpoTVAp87wlpLD9eLpI2wihQ8fUBLR9G9xtFXgB6zou8c1tC1Sd9kBdMkBxFPfB
+CMFEwDGUGYpS3B0+mCD0X0M+hj2Ra62TnZsGGE1UQKBgQD90vsBQ4fAEWHYXR//
1FyjwDsdOJ16Uf646aA3LkbXEDInZuRyHoo5+D2Ar9ddqcydXT2ujZsvaygMTCQD
WsdcXEPiB87Io+07zAsNvBbhUhP7EScQV5JgoGS1ZQgkyYwRWchExT1719QaOr/Z
pCt4tL3DpRJ1vR+FBjJ8K4xdkQKBgQDymdlgLxt+r1x+Tk/ZypbFALwZsNArbxjv
FdWhrv2jf3L1rfvEgjeu9NQviZCpVRxN9LAzb7reBQwOM+Yt+RAcB87O1RxH8j1s
XffYTAqnjPbIJ8IMLibuZ6vjUF3B/aRgui7v3f7zRp0SMUVJAY/d2stdOCFT6auO
tCvGtl/ydQKBgDLRR8G0BHy2vjE0S9DLcpSySuOJzzWLLwVUeOgzUqmCK5hp6DjU
1nXOtnmKOwMcmMO0xEGrRjOTL5xurhMh3KIoMssRJxxSfY+oRVpFmwsXhLqSb5C9
B6hi1GbgyGWdGHbs08S4/JtL1cI+muR3EuECxq9h4DVEXQgj+n2TtnGRAoGAKuCU
MdLBmkdmIpC2vjh3I0R4+lVsxXBySLdkNZpXC9GXwOJKMDYPn2V4Jxq6LaN0SDbp
+X1S2rCrq8rycMenWDztCVNTF0gyIPgOuPTfoTNh3ohgXIS/rr01/QwUNhgdOFdP
umdTCy48zp1UsI2NHtnvvX8RLOKMxsEDR7CuDo0Cf2S50fphudVuzu85qsDmTLFx
vQFqjvASwKBGg18uBRbiqLgwKkwW8KfU3+oJFxgSJoz95cGgJh0ZucD3nqwSuVi1
T1334PDPf9qqRREmcq4MqaJfqyjy7ltlezpUHxAjLtY1LjKP/wR0gB72zWLGvH5n
rem4A80w0WTfmfU2RgE=
-----END PRIVATE KEY-----`);
const publicKey = createPublicKey(privateKey);
const publicJwk = publicKey.export({ format: "jwk" });
Object.assign(publicJwk, { kid: keyId, alg: "RS256", use: "sig" });

const sessions = {
  "manager-a-subject": {
    user: { id: 1, email: "manager-a@example.test", display_name: "Alice Example" },
    memberships: [
      membership("ldl", "ldl-franchise-a", "Manager A LDL", "ldl-team-a", true),
      membership("bdb", "bdb-franchise-a", "Manager A BDB", "bdb-team-a", true),
    ],
  },
  "manager-b-subject": {
    user: { id: 2, email: "manager-b@example.test", display_name: "Bob Example" },
    memberships: [
      membership("ldl", "ldl-franchise-b", "xrtc", "ldl-team-b", false),
      membership("bdb", "bdb-franchise-b", "xrtc", "bdb-team-b", false),
    ],
  },
  "gnfc-manager-subject": {
    user: { id: 3, email: "gnfc-manager@example.test", display_name: "GNFC Manager" },
    memberships: [membership("gnfc", "gnfc-athens-bricklayers", "Athens BrickLayers", "gnfc-athens", false)],
  },
};
const privateTradeOutlooks = new Map();
const reviewedInjuryReports = new Map();
const performanceDelays = new Map();
const sessionDelays = new Map();
/** In-memory watchlists keyed by `${subject}:${league}`. */
const watchlistStore = new Map();


function membership(league, franchiseId, franchiseName, teamId, commissioner) {
  return {
    league_slug: league,
    franchise_id: franchiseId,
    franchise_name: franchiseName,
    role: commissioner ? "commissioner" : "manager",
    commissioner,
    fantrax_team_id: teamId,
    mapping_season: "2026-27",
    mapping_captured_at: "2026-09-10T08:00:00Z",
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://127.0.0.1:3102",
  "Access-Control-Allow-Headers": "cf-access-jwt-assertion, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function send(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...corsHeaders,
  });
  response.end(JSON.stringify(payload));
}

function sessionFor(request) {
  return sessions[request.headers["x-fantasy-identity-subject"]] ?? null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3101");

  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    return response.end();
  }

  if (url.pathname === "/api/health") {
    return send(response, 200, { status: "ok" });
  }
  if (url.pathname === "/cdn-cgi/access/certs") {
    return send(response, 200, { keys: [publicJwk] });
  }
  if (url.pathname === "/test/reset-state" && request.method === "POST") {
    watchlistStore.clear();
    privateTradeOutlooks.clear();
    reviewedInjuryReports.clear();
    performanceDelays.clear();
    sessionDelays.clear();
    return send(response, 200, { ok: true });
  }
  if (url.pathname === "/test/access-token") {
    const subject = url.searchParams.get("subject");
    const session = subject ? sessions[subject] : null;
    return session
      ? send(response, 200, { token: accessToken(subject, session.user) })
      : send(response, 404, { error: "Unknown test identity" });
  }
  if (url.pathname === "/test/delay-performance") {
    const teamId = url.searchParams.get("team");
    const delay = Number(url.searchParams.get("ms"));
    if (!teamId || !Number.isInteger(delay) || delay < 0 || delay > 5000) {
      return send(response, 400, { error: "Invalid delay" });
    }
    performanceDelays.set(teamId, delay);
    return send(response, 200, { teamId, delay });
  }
  if (url.pathname === "/test/delay-session") {
    const subject = url.searchParams.get("subject");
    const delay = Number(url.searchParams.get("ms"));
    if (!subject || !Number.isInteger(delay) || delay < 0 || delay > 5000) {
      return send(response, 400, { error: "Invalid delay" });
    }
    sessionDelays.set(subject, delay);
    return send(response, 200, { subject, delay });
  }
  if (url.pathname === "/api/fantasy/session") {
    const session = sessionFor(request);
    if (!session) return send(response, 401, { error: "Unknown test identity" });
    const subject = request.headers["x-fantasy-identity-subject"];
    const delay = sessionDelays.get(subject) ?? 0;
    sessionDelays.delete(subject);
    if (delay) {
      setTimeout(() => send(response, 200, session), delay);
      return;
    }
    return send(response, 200, session);
  }
  if (url.pathname === "/api/fantasy/leagues") {
    return send(response, 200, [leagueFixture("ldl"), leagueFixture("bdb"), leagueFixture("gnfc")]);
  }
  if (url.pathname === "/api/fantasy/gnfc/standings") {
    return send(response, 200, []);
  }
  if (url.pathname === "/api/fantasy/gnfc/roster/gnfc-athens") {
    const member = sessions["gnfc-manager-subject"].memberships[0];
    return send(response, 200, {
      team_id: member.fantrax_team_id, team_name: member.franchise_name,
      logo: null, owner: "GNFC Manager", players: rosterPerformanceFixture("gnfc", member, false).players,
    });
  }
  if (url.pathname === "/api/fantasy/gnfc/roster/gnfc-athens/performance") {
    return send(response, 200, rosterPerformanceFixture("gnfc", sessions["gnfc-manager-subject"].memberships[0], false));
  }
  if (url.pathname === "/api/fantasy/gnfc/roster/gnfc-athens/category-profile") {
    return send(response, 200, categoryProfileFixture("gnfc", sessions["gnfc-manager-subject"].memberships[0]));
  }
  if (url.pathname === "/api/fantasy/gnfc/roster/gnfc-athens/targets") {
    const member = sessionFor(request)?.memberships.find((item) => item.league_slug === "gnfc");
    if (!member) return send(response, 403, { error: "GNFC membership required" });
    const fixture = targetsFixture(
      "gnfc",
      member,
      3,
      url.searchParams.get("action_scope"),
      url.searchParams.get("category"),
    );
    const candidate = fixture.candidates[0];
    candidate.season_average = { games: 2, minutes: 25, points: 17 };
    candidate.fit_explanation.sample_games = 2;
    candidate.fit_explanation.sample_weight = 0.4;
    candidate.fit_explanation.full_weight_games = 5;
    candidate.fit_explanation.sample_adjustment = "current_season_only";
    candidate.actionability = { status: "requires_move", reasons: ["roster_drop_required", "current_role_unverified"], role_signal: "insufficient_current_sample", cap_result: "not_applicable", roster_result: "drop_required" };
    candidate.minutes_trend = { basis: "completed_game_logs", season: "2026-27", previous_season: "2025-26", state: "early_increase", sample_games: 2, minutes: 25, previous_minutes: 17, delta_minutes: 8, delta_percent: 47, previous_games: 60, latest_game_date: "2026-10-24" };
    return send(response, 200, applyTargetsPagination(fixture, url.searchParams));
  }
  const outlookMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/players\/(\d+)\/my-trade-outlook$/);
  if (outlookMatch) {
    const session = sessionFor(request);
    const [, league, nbaId] = outlookMatch;
    if (!session?.memberships.some((item) => item.league_slug === league)) {
      return send(response, 403, { error: "Membership required" });
    }
    const key = `${session.user.id}:${league}:${nbaId}`;
    if (request.method === "GET") return send(response, 200, { brief: privateTradeOutlooks.get(key) ?? null });
    if (request.method === "DELETE") {
      privateTradeOutlooks.delete(key);
      return send(response, 200, { brief: null });
    }
    if (request.method === "PUT") {
      let rawBody = "";
      request.on("data", (chunk) => { rawBody += chunk; });
      request.on("end", () => {
        const body = JSON.parse(rawBody || "{}");
        const brief = {
          assessment: body.assessment, availability: body.availability,
          upside: body.upside, note: body.note, sourceUrl: body.sourceUrl,
          sourceDate: body.sourceDate, savedAt: "2026-09-30T12:00:00Z",
        };
        privateTradeOutlooks.set(key, brief);
        send(response, 200, { brief });
      });
      return;
    }
  }
  const injuryMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/players\/(\d+)\/injury-report$/);
  if (injuryMatch) {
    const session = sessionFor(request);
    const [, league, nbaId] = injuryMatch;
    const member = session?.memberships.find((item) => item.league_slug === league);
    if (!member) return send(response, 403, { error: "Membership required" });
    if (request.method === "GET") return send(response, 200, { report: reviewedInjuryReports.get(nbaId) ?? null });
    if (request.method === "POST") {
      if (!member.commissioner) return send(response, 403, { error: "Commissioner required" });
      let rawBody = "";
      request.on("data", (chunk) => { rawBody += chunk; });
      request.on("end", () => {
        const body = JSON.parse(rawBody || "{}");
        const report = { ...body, recordedAt: "2026-10-01T12:00:00Z" };
        reviewedInjuryReports.set(nbaId, report);
        send(response, 201, { report });
      });
      return;
    }
  }
  const researchMatch = url.pathname.match(/^\/api\/nba\/players\/by-nba-id\/(\d+)\/research$/);
  if (researchMatch) {
    const session = sessionFor(request);
    if (!session) return send(response, 401, { error: "Unknown test identity" });
    const nbaId = Number(researchMatch[1]);
    return send(response, 200, playerResearchFixture(nbaId));
  }
  if (url.pathname === "/api/nba/scoreboard") {
    const team = (name, short) => ({ name, short, logo: null, score: null, winner: false });
    return send(response, 200, [
      {
        id: "e2e-game-owned", date: "2026-10-09T23:00:00Z", status: "Scheduled", completed: false,
        away: team("New Orleans Pelicans", "NO"), home: team("Minnesota Timberwolves", "MIN"),
      },
      {
        id: "e2e-game-unowned", date: "2026-10-09T23:30:00Z", status: "Scheduled", completed: false,
        away: team("New York Knicks", "NY"), home: team("Boston Celtics", "BOS"),
      },
      {
        id: "e2e-game-previous", date: "2026-10-08T23:00:00Z", status: "Final", completed: true,
        nba_date: "2026-10-08", expires_at: new Date(Date.now() + 60_000).toISOString(),
        away: team("Toronto Raptors", "TOR"), home: team("Miami Heat", "MIA"),
      },
    ]);
  }
  if (url.pathname === "/api/nba/news") {
    return send(response, 200, []);
  }
  if (url.pathname === "/api/nba/players/preseason-averages") {
    response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3102");
    response.setHeader("Access-Control-Allow-Headers", "cf-access-jwt-assertion");
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    const ids = (url.searchParams.get("nba_ids") ?? "").split(",").map(Number);
    return send(response, 200, {
      season: "2026-27",
      players: Object.fromEntries(ids.map((id) => [String(id), id === 10000 ? {
        season: "2026-27", games: 2, last_game_date: "2026-10-12",
        status: "available", source: "ESPN",
        averages: {
          minutes: 22.5, fg_pct: 45, three_pm: 1, ft_pct: 80,
          points: 10, rebounds: 5, assists: 8, steals: 1, blocks: 0, turnovers: 2,
        },
      } : null])),
    });
  }
  if (/^\/api\/fantasy\/(ldl|bdb)\/standings$/.test(url.pathname)) {
    return send(response, 200, []);
  }
  const watchlistMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb|gnfc)\/watchlist(?:\/(\d+))?$/);
  if (watchlistMatch) {
    const league = watchlistMatch[1];
    const playerId = watchlistMatch[2] ? Number(watchlistMatch[2]) : null;
    const session = sessionFor(request);
    if (!session) return send(response, 401, { error: "Unauthorized" });
    if (!session.memberships.some((m) => m.league_slug === league)) {
      return send(response, 403, { error: "Not a member of this league" });
    }
    const subject = request.headers["x-fantasy-identity-subject"];
    const key = `${subject}:${league}`;
    if (!watchlistStore.has(key)) {
      watchlistStore.set(key, seedWatchlistEntries(league, subject));
    }
    const entries = watchlistStore.get(key);

    if (request.method === "GET") {
      const sorted = [...entries].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return Date.parse(b.updated_at) - Date.parse(a.updated_at);
      });
      return send(response, 200, {
        league: leagueFixture(league),
        owner: subject,
        window_days: Number(url.searchParams.get("window") ?? 7),
        categories: league === "gnfc" ? ["points", "rebounds", "assists"] : ["points", "rebounds", "assists", "steals", "blocks"],
        entries: sorted,
      });
    }

    if (request.method === "POST") {
      let rawBody = "";
      request.on("data", (chunk) => { rawBody += chunk; });
      request.on("end", () => {
        const body = JSON.parse(rawBody || "{}");
        const nbaPlayerId = Number(body?.nba_player_id);
        const priority = Number(body?.priority ?? 2);
        const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
        if (!Number.isInteger(nbaPlayerId) || nbaPlayerId <= 0 || ![1, 2, 3].includes(priority) || notes.length > 2000) {
          return send(response, 400, { error: "Invalid watchlist entry" });
        }
        const existing = entries.find((e) => e.nba_player_id === nbaPlayerId);
        const now = new Date().toISOString();
        if (existing) {
          existing.notes = notes;
          existing.priority = priority;
          existing.updated_at = now;
          return send(response, 200, existing);
        }
        const created = {
          id: entries.length ? Math.max(...entries.map((e) => e.id)) + 1 : 1,
          owner_subject: subject,
          league_slug: league,
          nba_player_id: nbaPlayerId,
          notes,
          priority,
          created_at: now,
          updated_at: now,
          resolved: true,
          player: watchlistPlayerFixture(nbaPlayerId, league, "free_agent"),
        };
        entries.push(created);
        return send(response, 201, created);
      });
      return;
    }

    if (request.method === "DELETE" && playerId) {
      const next = entries.filter((e) => e.nba_player_id !== playerId);
      watchlistStore.set(key, next);
      return send(response, 200, { ok: true });
    }

    return send(response, 405, { error: "Method not allowed" });
  }

  if (/^\/api\/fantasy\/gnfc\/free-agent-radar$/.test(url.pathname)) {
    // GNFC FA market not ready in mock — intentional 503 for Discovery FA Trends empty state.
    return send(response, 503, { error: "Free-agent market not ready for this league" });
  }

  if (/^\/api\/fantasy\/(ldl|bdb)\/free-agent-radar$/.test(url.pathname)) {
    const league = url.pathname.includes("/bdb/") ? "bdb" : "ldl";
    return send(response, 200, freeAgentRadarFixture(league));
  }
  const ledgerMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/commissioner\/completed-trades$/);
  if (ledgerMatch) {
    const league = ledgerMatch[1];
    if (request.method === "GET") {
      return send(response, 200, { league_slug: league, count: 0, trades: [] });
    }
    if (request.method === "POST") {
      request.resume();
      request.on("end", () => send(response, 201, {
        public_id: "00000000-0000-0000-0000-000000000051",
        roster_verification: { sync_pending: 6 },
      }));
      return;
    }
  }
  const ledgerOptionsMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/commissioner\/completed-trades\/options$/);
  if (ledgerOptionsMatch) {
    const league = ledgerOptionsMatch[1];
    return send(response, 200, completedTradeOptionsFixture(league));
  }
  const performanceMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/roster\/([^/]+)\/performance$/);
  if (performanceMatch) {
    const [, league, teamId] = performanceMatch;
    const membership = membershipByTeam(league, teamId);
    if (!membership) return send(response, 403, { error: "Not your team" });
    const incomplete = teamId === "bdb-team-b";
    const delay = performanceDelays.get(teamId) ?? 0;
    performanceDelays.delete(teamId);
    if (delay) {
      setTimeout(() => send(response, 200, rosterPerformanceFixture(league, membership, incomplete)), delay);
      return;
    }
    return send(response, 200, rosterPerformanceFixture(league, membership, incomplete));
  }
  const rosterMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/roster\/([^/]+)$/);
  if (rosterMatch) {
    const [, league, teamId] = rosterMatch;
    if (teamId === "e2e-temporary") return send(response, 503, { error: "Temporary roster outage" });
    const membership = membershipByTeam(league, teamId);
    if (!membership) return send(response, 404, { error: "Team not found" });
    return send(response, 200, {
      team_id: teamId, team_name: membership.franchise_name,
      logo: null, owner: null, players: [],
    });
  }
  const playersMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb|gnfc)\/players$/);
  if (playersMatch) {
    return send(response, 200, leaguePlayerExplorerFixture(playersMatch[1]));
  }
  const profileMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/roster\/([^/]+)\/category-profile$/);
  if (profileMatch) {
    const [, league, teamId] = profileMatch;
    const membership = membershipByTeam(league, teamId);
    if (!membership) return send(response, 403, { error: "Not your team" });
    const profile = categoryProfileFixture(league, membership);
    if (url.searchParams.get("basis") === "window") {
      profile.basis_requested = "window";
      profile.basis_used = "window";
      const blocksIndex = profile.categories.findIndex((row) => row.key === "blocks");
      if (blocksIndex >= 0) {
        profile.categories[blocksIndex] = {
          ...profile.categories[blocksIndex],
          value: 12,
          league_rank: 5,
        };
      }
    }
    return send(response, 200, profile);
  }
  const seasonActualsMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb|gnfc)\/roster\/([^/]+)\/season-category-actuals$/);
  if (seasonActualsMatch) {
    const [, league, teamId] = seasonActualsMatch;
    if (teamId === "ldl-team-b") return send(response, 503, { error: "Fantrax unavailable" });
    const membership = league === "gnfc"
      ? sessions["gnfc-manager-subject"].memberships[0]
      : membershipByTeam(league, teamId);
    if (!membership) return send(response, 404, { error: "Team not found" });
    return send(response, 200, {
      source: "fantrax", view: "SEASON_STATS", timeframe: "YEAR_TO_DATE",
      fetched_at: "2026-10-26T09:00:00Z", stale: false,
      league_teams: league === "gnfc" ? 12 : 20,
      team: { id: teamId, name: membership.franchise_name, categories: { blocks: { rank: 4, value: 22 } } },
    });
  }
  const periodBaselineMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb|gnfc)\/roster\/([^/]+)\/period-category-baseline$/);
  if (periodBaselineMatch) {
    response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3102");
    const [, league, teamId] = periodBaselineMatch;
    if (teamId === "ldl-team-b") return send(response, 503, { error: "Unverified comparison" });
    return send(response, 200, {
      source: "fantrax_historical_lineups_and_nba_boxscores",
      league, team_id: teamId, scoring_period: 1,
      period_start: "2026-10-20T15:00:00-04:00",
      period_end: "2026-10-26T18:59:59-04:00",
      season: "2026-27", previous_season: "2025-26",
      actual_player_games: 31, covered_player_games: 31, missing_baseline_players: 0,
      categories: { blocks: { actual: 0.71, baseline: 0.64, favorable_delta: 0.07 } },
      comparison_scope: "same active player-games; counting stats per active player-game",
      weight_rule: "current pre-period NBA games / (current pre-period NBA games + 10)",
    });
  }
  const targetsMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/roster\/([^/]+)\/targets$/);
  if (targetsMatch) {
    const [, league, teamId] = targetsMatch;
    const session = sessionFor(request);
    const membership = session?.memberships.find((item) => (
      item.league_slug === league && item.fantrax_team_id === teamId
    ));
    if (!membership) return send(response, 403, { error: "Not your team" });
    const fixture = targetsFixture(
      league,
      membership,
      session.user.id,
      url.searchParams.get("action_scope"),
      url.searchParams.get("category"),
    );
    return send(response, 200, applyTargetsPagination(fixture, url.searchParams));
  }
  if (/^\/api\/fantasy\/(ldl|bdb)\/trade-suggestions$/.test(url.pathname)) {
    let rawBody = "";
    request.on("data", (chunk) => { rawBody += chunk; });
    request.on("end", () => {
      const body = JSON.parse(rawBody || "{}");
      send(response, 200, {
        selected_team_id: body.selected_team_id,
        identity_subject: request.headers["x-fantasy-identity-subject"],
        suggestions: [],
      });
    });
    return;
  }
  if (/^\/api\/fantasy\/(ldl|bdb)\/trade-package-analysis$/.test(url.pathname)) {
    request.resume();
    request.on("end", () => send(response, 400, {
      error: "Mock package analysis reached backend",
    }));
    return;
  }
  const discoveryMatch = url.pathname.match(
    /^\/api\/fantasy\/(ldl|bdb)\/roster\/([^/]+)\/roster-move-discovery$/,
  );
  if (discoveryMatch && request.method === "POST") {
    const [, league, teamId] = discoveryMatch;
    const session = sessionFor(request);
    if (!session) return send(response, 401, { error: "Unknown test identity" });
    const membership = session.memberships.find((item) => (
      item.league_slug === league && item.fantrax_team_id === teamId
    ));
    if (!membership) return send(response, 403, { error: "Not your team" });
    request.on("data", () => {});
    request.on("end", () => {
      send(response, 200, rosterMoveDiscoveryFixture(league, teamId));
    });
    return;
  }
  const analysisMatch = url.pathname.match(
    /^\/api\/fantasy\/(ldl|bdb)\/roster\/([^/]+)\/roster-move-analysis$/,
  );
  if (analysisMatch && request.method === "POST") {
    const [, league, teamId] = analysisMatch;
    const session = sessionFor(request);
    if (!session) return send(response, 401, { error: "Unknown test identity" });
    const membership = session.memberships.find((item) => (
      item.league_slug === league && item.fantrax_team_id === teamId
    ));
    if (!membership) return send(response, 403, { error: "Not your team" });
    let rawBody = "";
    request.on("data", (chunk) => { rawBody += chunk; });
    request.on("end", () => {
      const body = JSON.parse(rawBody || "{}");
      send(response, 200, rosterMoveAnalysisFixture(body));
    });
    return;
  }

  send(response, 404, { error: `No E2E fixture for ${url.pathname}` });
});

function rosterMoveDiscoveryFixture(league, teamId) {
  const moves = [1, 2, 3, 4].map((index) => ({
    tier: index === 1 ? "tier_1_target_ready" : "tier_2_target_needs_review",
    pair_feasibility: {
      status: index === 1 ? "feasible" : "needs_review",
      reasons: index === 1 ? [] : ["current_role_unverified"],
      salary_verified: true,
      cap_result: "compliant",
    },
    remove_player: {
      nba_id: 3000 + index,
      name: `Roster Player ${index}`,
      observed: { games: 10 },
    },
    add_player: {
      nba_id: 4000 + index,
      name: index === 2 ? "Jordan Goodwin" : `Free Agent ${index}`,
      observed: { games: index === 2 ? 3 : 12 },
      contribution_basis: { resolution: index === 2 ? "blended" : "current_only" },
      actionability: {
        status: index === 1 ? "ready" : "needs_review",
        reasons: index === 1 ? [] : ["current_role_unverified"],
      },
      injury: null,
    },
    target: { improved: ["oreb"], declined: [] },
    protect: {
      improved: [],
      preserved: ["points"],
      damaged: index === 4 ? ["steals"] : [],
    },
    meaningful_transitions: [
      {
        key: "oreb",
        classification: "TARGET",
        transition: "improved",
        // before_rank - after_rank; positive = places gained
        rank_delta: 5,
        z_delta: 0.35,
      },
    ],
    salary_cap: {
      applies: true,
      status: "applicable",
      verified: true,
      delta: -200_000,
      cap_result: "compliant",
    },
    invented_drop: false,
    reason_codes: [],
  }));
  return {
    league: { slug: league, season_phase: "in_season" },
    team_id: teamId,
    basis_requested: "season",
    basis_used: "season",
    recommended_strategy: {
      minimum_winning_core: 6,
      recommended_core_size: 8,
      core_category_keys: ["assists", "steals", "three_pm", "ft_pct", "points", "dreb", "blocks", "oreb"],
      categories: [
        { key: "assists", label: "AST", classification: "PROTECT" },
        { key: "steals", label: "STL", classification: "PROTECT" },
        { key: "three_pm", label: "3PTM", classification: "PROTECT" },
        { key: "ft_pct", label: "FT%", classification: "PROTECT" },
        { key: "points", label: "PTS", classification: "PROTECT" },
        { key: "dreb", label: "DREB", classification: "PROTECT" },
        { key: "blocks", label: "BLK", classification: "PROTECT" },
        { key: "oreb", label: "OREB", classification: "TARGET" },
        { key: "assist_turnover", label: "A/TO", classification: "TARGET" },
        { key: "fg_pct", label: "FG%", classification: "FLEX" },
        { key: "turnovers", label: "TO", classification: "PUNT_CANDIDATE" },
      ],
      method: { repairability: "profile_z_v1" },
      reason_codes: [],
    },
    tiers: {
      tier_1_target_ready: { count_evaluated: 1, returned: [moves[0]] },
      tier_2_target_needs_review: {
        count_evaluated: 3,
        returned: [moves[1], moves[2], moves[3]],
      },
      tier_3_target_protect_tradeoff: { count_evaluated: 0, returned: [] },
      tier_economically_unverified: { count_evaluated: 0, returned: [] },
      tier_blocked: { count_evaluated: 0, returned: [] },
      tier_other: { count_evaluated: 0, returned: [] },
    },
    method: { overall_score: null },
  };
}

function rosterMoveAnalysisFixture(body) {
  return {
    team_id: "ldl-team-a",
    basis_used: "season",
    move: {
      removed: [{ nba_id: body.remove_nba_id, name: "Drop Candidate", observed: { games: 10 } }],
      added: [{
        nba_id: body.add_nba_id,
        name: "Add Candidate",
        observed: { games: 3 },
        contribution_basis: { resolution: "blended" },
      }],
      invented_drop: false,
    },
    category_impact: [
      {
        key: "oreb",
        label: "OREB",
        classification: "TARGET",
        before: { league_rank: 11, z: 0.01 },
        after: { league_rank: 6, z: 0.4 },
        rank_delta: -5,
        z_delta: 0.39,
        transition: "improved",
      },
    ],
    strategic_impact: {
      target: { improved: ["oreb"], declined: [], unchanged: [] },
      protect: { improved: [], preserved: ["points"], damaged: [] },
    },
    salary_cap: { applies: true, delta: -200_000 },
    actionability: {
      added: { status: "needs_review", reasons: ["current_role_unverified"] },
    },
  };
}

function leagueFixture(slug) {
  return {
    slug,
    name: slug === "ldl" ? "LDL" : slug === "gnfc" ? "GNFC Γ5" : "BδB",
    league_id: `${slug}-league`,
    personal_team_id: "global-config-must-not-be-used",
    personal_team_name: "Global config must not be used",
    enabled: true,
    availability_ready: slug === "gnfc",
    categories: slug === "gnfc" ? ["points", "rebounds", "assists"] : undefined,
    season_phase: "off_season",
    roster_rules: { minimum_players: 13, standard_maximum: 14 },
  };
}

function completedTradeOptionsFixture(league) {
  const franchise = (suffix, name, start) => ({
    id: `${league}-${suffix}`,
    name,
    roster_captured_at: "2026-09-18T08:00:00Z",
    unmapped_player_count: 0,
    players: [0, 1, 2].map((offset) => ({
      id: start + offset,
      nba_id: 1000 + start + offset,
      name: `${name} Player ${offset + 1}`,
      position: "G",
      nba_team: "TST",
    })),
  });
  const franchises = [
    franchise("franchise-a", "Alpha", 10),
    franchise("franchise-b", "Beta", 20),
    franchise("franchise-c", "Gamma", 30),
  ];
  franchises[0].historical_player_ids = [10, 11, 12, 13];
  franchises[1].historical_player_ids = [20, 21, 22];
  franchises[2].historical_player_ids = [30, 31, 32];
  return {
    league_slug: league,
    fantasy_season: "2026-27",
    franchises,
    player_catalog: [
      ...franchises.flatMap((item) => item.players),
      { id: 13, nba_id: 1013, name: "Alpha Former Player", position: "G", nba_team: "TST" },
      { id: 99, nba_id: 1099, name: "Unrelated Player", position: "G", nba_team: "TST" },
    ],
    draft_picks: [{
      id: 701,
      draft_year: 2028,
      round: 2,
      original_franchise: { id: `${league}-franchise-c`, name: "Gamma" },
      current_owner: { id: `${league}-franchise-a`, name: "Alpha" },
    }],
  };
}

function playerResearchFixture(nbaId) {
  return {
    generated_at: "2026-09-15T12:00:00+00:00",
    player: { player_id: 42, nba_id: nbaId, name: "Research Player", position: "G", nba_team: "Test Team" },
    news_evidence: [{
      provider: "espn",
      headline: "Research Player earns a larger role",
      description: "A sourced test-only player update.",
      published_at: "2026-09-14T12:00:00+00:00",
      url: "https://example.test/research-player",
      categories: ["Research Player"],
      player_match: { method: "exact_provider_category_tag", tag: "Research Player" },
    }],
    role_signal: {
      source: "cached_game_logs",
      season: "2025-26",
      recent_games: 5,
      recent_minutes: 29,
      season_minutes: 24,
      minutes_delta: 5,
      latest_game_date: "2026-09-14",
      affects_recommendation: false,
      status: "observed_trend",
      direction: "increasing",
      confidence: "medium",
      reason: "last_five_games_compared_with_season_average",
    },
    coverage: {
      status: "available",
      provider: "espn",
      searched_days: 30,
      exact_player_tag_required: true,
      provider_error: null,
      limitations: [],
    },
    advisor_policy: {
      affects_trade_recommendation: false,
      mode: "context_only",
      reason: "research_sources_are_not_yet_calibrated_for_scoring",
    },
  };
}

function membershipByTeam(league, teamId) {
  return Object.values(sessions)
    .flatMap((session) => session.memberships)
    .find((item) => item.league_slug === league && item.fantrax_team_id === teamId) ?? null;
}

/** Representative Player Explorer payload for Discovery Browse visual/e2e rendering. */
function leaguePlayerExplorerFixture(league) {
  const members = league === "gnfc"
    ? [sessions["gnfc-manager-subject"].memberships[0]]
    : ["manager-a-subject", "manager-b-subject"].map((subject) => (
      sessions[subject].memberships.find((item) => item.league_slug === league)
    )).filter(Boolean);
  const categories = league === "gnfc"
    ? ["PTS", "REB", "AST"]
    : league === "bdb"
      ? ["FG%", "FT%", "3PTM", "PTS", "REB", "AST", "ST", "BLK", "TO"]
      : ["FG%", "FT%", "3PTM", "PTS", "OREB", "DREB", "AST", "ST", "BLK", "TO", "A/TO"];
  const positions = ["PG", "SG", "SF", "PF", "C", "G", "F"];
  const nbaTeams = [
    ["Boston Celtics", "BOS"],
    ["Minnesota Timberwolves", "MIN"],
    ["Denver Nuggets", "DEN"],
    ["New York Knicks", "NYK"],
    ["Oklahoma City Thunder", "OKC"],
    ["Dallas Mavericks", "DAL"],
  ];

  // Rostered identity must remain the shared pre-Discovery explorer contract used by
  // Trade Analyzer and other consumers of GET /api/fantasy/{league}/players:
  //   name = "{franchise} Player {n}", nba_id = 10000+n (team A) / 11000+n (team B),
  //   Player 1 position = "G" so option labels match /^xrtc Player 1 G/.
  // Browse still gets rich stats/FA rows below; only the identity contract is restored.
  const rostered = members.flatMap((member, teamIndex) => (
    Array.from({ length: 6 }, (_, index) => {
      const rank = teamIndex * 6 + index + 1;
      const [nbaTeam, nbaShort] = nbaTeams[(teamIndex + index) % nbaTeams.length];
      const points = 22 - index * 1.4 - teamIndex;
      const playerNumber = index + 1;
      return {
        nba_id: 10_000 + teamIndex * 1_000 + index,
        player_id: 20_000 + teamIndex * 1_000 + index,
        name: `${member.franchise_name} Player ${playerNumber}`,
        short_name: `${member.franchise_name} Player ${playerNumber}`,
        status: index === 5 ? "Reserve" : "Active",
        nba_team: index === 0 ? "Test Team" : nbaTeam,
        nba_team_short: index === 0 ? "TST" : nbaShort,
        position: index === 0 ? "G" : positions[index % positions.length],
        photo: null,
        availability: "rostered",
        fantasy_team: {
          id: member.fantrax_team_id,
          name: member.franchise_name,
          logo: null,
          owner: null,
        },
        injury: teamIndex === 0 && index === 0
          ? { status: "GTD", body_part: "ankle", detail: null, source: "fixture", updated_at: null }
          : null,
        salary_2026_27: league === "gnfc" ? null : String(28_000_000 - rank * 1_100_000),
        salaries: league === "gnfc" ? null : { "2026-27": String(28_000_000 - rank * 1_100_000) },
        latest_game: null,
        window_stats: {
          games: 3 + (index % 3),
          minutes: 32 - index,
          points: points + 1.5,
          assists: 6.2 - index * 0.3,
          rebounds: 7.1 - index * 0.2,
          oreb: 1.4,
          dreb: 5.7,
          steals: 1.2,
          blocks: 0.8,
          turnovers: 2.1,
          three_pm: 2.4,
          fg_pct: 0.47,
          ft_pct: 0.84,
          assist_turnover: 2.9,
        },
        season_average: {
          games: 18 + index,
          minutes: 30 - index * 0.5,
          points,
          assists: 5.8 - index * 0.25,
          rebounds: 6.8 - index * 0.15,
          oreb: 1.2,
          dreb: 5.4,
          steals: 1.1,
          blocks: 0.7,
          turnovers: 2.0,
          three_pm: 2.1,
          fg_pct: 0.46,
          ft_pct: 0.83,
          assist_turnover: 2.7,
        },
        category_strengths: index < 2 ? ["PTS", "AST"] : ["REB"],
        impact_rank: rank,
        impact_score: 1.4 - rank * 0.08,
        freshness: { roster: null, stats: null, injury: null },
      };
    })
  ));

  const freeAgents = Array.from({ length: 8 }, (_, index) => {
    const rank = rostered.length + index + 1;
    const [nbaTeam, nbaShort] = nbaTeams[index % nbaTeams.length];
    return {
      nba_id: 41_000 + index,
      player_id: 51_000 + index,
      name: `Free Agent ${nbaShort} ${index + 1}`,
      short_name: `FA ${index + 1}`,
      status: "Active",
      nba_team: nbaTeam,
      nba_team_short: nbaShort,
      position: positions[(index + 2) % positions.length],
      photo: null,
      availability: "free_agent",
      availability_rank: index + 1,
      availability_of: 8,
      nba_relevance: index < 6 ? "current_or_recent" : "legacy_only",
      fantasy_team: null,
      injury: null,
      salary_2026_27: league === "gnfc" ? null : String(12_000_000 - index * 700_000),
      salaries: league === "gnfc" ? null : { "2026-27": String(12_000_000 - index * 700_000) },
      latest_game: null,
      window_stats: {
        games: 4,
        minutes: 26 - index,
        points: 16 - index * 0.8,
        assists: 4.1,
        rebounds: 5.2,
        oreb: 1.0,
        dreb: 4.2,
        steals: 1.0,
        blocks: 0.6,
        turnovers: 1.8,
        three_pm: 1.9,
        fg_pct: 0.45,
        ft_pct: 0.8,
        assist_turnover: 2.3,
      },
      season_average: {
        games: 12 + index,
        minutes: 24 - index * 0.4,
        points: 14.5 - index * 0.6,
        assists: 3.8,
        rebounds: 4.9,
        oreb: 0.9,
        dreb: 4.0,
        steals: 0.9,
        blocks: 0.5,
        turnovers: 1.7,
        three_pm: 1.7,
        fg_pct: 0.44,
        ft_pct: 0.79,
        assist_turnover: 2.2,
      },
      category_strengths: ["STL"],
      impact_rank: rank,
      impact_score: 0.55 - index * 0.05,
      freshness: { roster: null, stats: null, injury: null },
    };
  });

  const players = [...rostered, ...freeAgents];
  return {
    league: {
      ...leagueFixture(league),
      categories,
    },
    snapshot: {
      captured_at: "2026-10-30T12:00:00Z",
      generated_at: "2026-10-30T12:01:00Z",
      source: "database_cache",
    },
    window: { days: 7, from: "2026-10-23", to: "2026-10-30", season: "2026-27" },
    categories,
    ranking_method: "fixture_category_z_sum",
    ranking_basis: "season",
    availability_basis: "latest_league_roster_snapshots",
    counts: {
      total: players.length,
      rostered: rostered.length,
      free_agents: freeAgents.length,
      free_agents_ranked: freeAgents.filter((player) => player.availability_rank != null).length,
      free_agents_current_or_recent: freeAgents.filter((player) => player.nba_relevance === "current_or_recent").length,
      free_agents_legacy_only: freeAgents.filter((player) => player.nba_relevance === "legacy_only").length,
      ranked: players.length,
    },
    nba_relevance_basis: {
      classification: "current_or_recent_evidence",
      contract_season: "2026-27",
      performance_season: "2026-27",
      evidence: ["current_team", "current_salary", "recent_performance"],
      legacy_only_means: "fixture",
    },
    teams: members.map((member) => ({
      id: member.fantrax_team_id,
      name: member.franchise_name,
      logo: null,
      owner: null,
    })),
    players,
  };
}

function rosterPerformanceFixture(league, membership, incomplete) {
  const playerCount = incomplete ? 8 : 14;
  return {
    league: leagueFixture(league),
    team: {
      id: membership.fantrax_team_id,
      name: membership.franchise_name,
      logo: null,
      owner: null,
      ...(league === "bdb" ? { claim_budget: { remaining: 38, source: "fixture" } } : {}),
    },
    window: { days: 7, from: "2026-09-03", to: "2026-09-10", season: "2026-27" },
    categories: ["FT%", "3PTM", "AST"],
    ranking_method: "fixture",
    payroll: league === "ldl" ? {
      includes_statuses: ["Active", "Reserve", "IR"],
      seasons: [{
        season: "2026-27",
        total: membership.fantrax_team_id.endsWith("-a") ? 230_000_000 : 190_000_000,
        known_players: playerCount,
        free_agents: 0,
        cap: 217_500_000,
        remaining: membership.fantrax_team_id.endsWith("-a") ? -12_500_000 : 27_500_000,
        status: membership.fantrax_team_id.endsWith("-a") ? "over" : "under",
        cap_provisional: false,
      }],
    } : undefined,
    players: Array.from({ length: playerCount }, (_, index) => ({
      nba_id: 10_000 + index,
      player_id: 20_000 + index,
      name: `Fixture Player ${index + 1}`,
      short_name: `Player ${index + 1}`,
      status: "Active",
      nba_team: index === 1 ? "Minnesota Timberwolves" : "Test Team",
      nba_team_short: index === 1 ? "MIN" : "TST",
      position: "G",
      photo: null,
      fantasy_team: null,
      injury: index === 0 && membership.fantrax_team_id.endsWith("-a")
        ? { status: "GTD", body_part: "ankle", detail: null, source: "fixture", updated_at: null }
        : null,
      latest_game: null,
      window_stats: { games: 0 },
      season_average: null,
      roster_watch: index === 0 ? {
        basis: "completed_game_logs", season: "2026-27", previous_season: "2025-26",
        season_games: 3, latest_game_date: "2026-10-24",
        role: { state: "watch", sample_games: 3, minutes: 15, previous_minutes: 28,
          delta_minutes: -13, delta_percent: -46.4, previous_games: 70 },
        production: { state: "insufficient_sample", sample_games: 3, declines: [] },
      } : undefined,
      category_strengths: [],
      impact_rank: null,
      impact_score: null,
      freshness: { roster: null, stats: null, injury: null },
    })),
  };
}

function categoryProfileFixture(league, membership) {
  const teams = league === "gnfc" ? 12 : 20;
  return {
    league: leagueFixture(league),
    team: { id: membership.fantrax_team_id, name: membership.franchise_name, logo: null, owner: null },
    basis_requested: "season",
    basis_used: "season",
    scope: "roster_rate",
    window: { days: 14, from: "2026-08-27", to: "2026-09-10", season: "2026-27" },
    snapshot: { captured_at: "2026-09-10T08:00:00Z", generated_at: "2026-09-10T08:01:00Z", source: "database_cache" },
    sample: { league_teams: teams, players_included: 14, players_missing_stats: 0, league_players_included: { minimum: 13, maximum: 14, average: 14 } },
    categories: [
      { key: "assists", label: "AST", value: 28.1, league_rank: 1, eligible_teams: teams, percentile: 0.0, league_mean: 22.0, z: 1.4, verdict: "strength", sample: null },
      { key: "steals", label: "STL", value: 9.2, league_rank: 1, eligible_teams: teams, percentile: 0.0, league_mean: 7.0, z: 1.2, verdict: "strength", sample: null },
      { key: "three_pm", label: "3PTM", value: 14.5, league_rank: 2, eligible_teams: teams, percentile: 0.05, league_mean: 11.0, z: 1.0, verdict: "strength", sample: null },
      { key: "blocks", label: "BLK", value: 8.5, league_rank: 6, eligible_teams: teams, percentile: 0.25, league_mean: 6.9, z: 0.65, verdict: "strength", sample: null },
      { key: "fg_pct", label: "FG%", value: 0.47, league_rank: 10, eligible_teams: teams, percentile: 0.5, league_mean: 0.47, z: 0.0, verdict: "neutral", sample: null },
      { key: "oreb", label: "OREB", value: 9.1, league_rank: 16, eligible_teams: teams, percentile: 0.8, league_mean: 11.0, z: -0.8, verdict: "weakness", sample: null },
      { key: "assist_turnover", label: "A/TO", value: 1.6, league_rank: 17, eligible_teams: teams, percentile: 0.85, league_mean: 2.0, z: -0.9, verdict: "weakness", sample: null },
      { key: "turnovers", label: "TO", value: 16.2, league_rank: 18, eligible_teams: teams, percentile: 0.9, league_mean: 13.0, z: -1.4, verdict: "weakness", sample: null },
    ],
    weaknesses: ["OREB", "A/TO", "TO"],
    strengths: ["AST", "STL", "3PTM", "BLK"],
    severe_weaknesses: [],
    method: { ranking: "fixture", ratios: "fixture", turnovers: "fixture", window_scope: "fixture" },
  };
}

function strategySummaryFixture(league) {
  if (league === "gnfc") {
    return {
      source: "system_recommended_strategy",
      minimum_winning_core: 2,
      recommended_core_size: 2,
      categories: [
        { key: "points", label: "PTS", classification: "TARGET", league_rank: 8, percentile: 0.35, z: -0.4, verdict: "weakness", in_core: true },
        { key: "rebounds", label: "REB", classification: "PROTECT", league_rank: 3, percentile: 0.8, z: 0.9, verdict: "strength", in_core: true },
        { key: "assists", label: "AST", classification: "FLEX", league_rank: 7, percentile: 0.45, z: -0.1, verdict: "neutral", in_core: false },
      ],
    };
  }
  return {
    source: "system_recommended_strategy",
    minimum_winning_core: 6,
    recommended_core_size: 7,
    categories: [
      { key: "fg_pct", label: "FG%", classification: "TARGET", league_rank: 15, percentile: 0.25, z: -0.8, verdict: "weakness", in_core: true },
      { key: "ft_pct", label: "FT%", classification: "TARGET", league_rank: 14, percentile: 0.3, z: -0.7, verdict: "weakness", in_core: true },
      { key: "dreb", label: "DREB", classification: "TARGET", league_rank: 13, percentile: 0.35, z: -0.55, verdict: "weakness", in_core: true },
      { key: "three_pm", label: "3PTM", classification: "PROTECT", league_rank: 4, percentile: 0.8, z: 0.85, verdict: "strength", in_core: true },
      { key: "points", label: "PTS", classification: "PROTECT", league_rank: 5, percentile: 0.75, z: 0.7, verdict: "strength", in_core: true },
      { key: "assists", label: "AST", classification: "PROTECT", league_rank: 3, percentile: 0.85, z: 1.0, verdict: "strength", in_core: true },
      { key: "steals", label: "STL", classification: "PROTECT", league_rank: 6, percentile: 0.7, z: 0.55, verdict: "strength", in_core: true },
      { key: "blocks", label: "BLK", classification: "PROTECT", league_rank: 7, percentile: 0.65, z: 0.4, verdict: "strength", in_core: true },
      { key: "oreb", label: "OREB", classification: "FLEX", league_rank: 11, percentile: 0.45, z: -0.05, verdict: "neutral", in_core: false },
      { key: "assist_turnover", label: "A/TO", classification: "FLEX", league_rank: 10, percentile: 0.5, z: 0.0, verdict: "neutral", in_core: false },
      { key: "turnovers", label: "TO", classification: "PUNT_CANDIDATE", league_rank: 18, percentile: 0.1, z: -1.4, verdict: "weakness", in_core: false },
    ],
  };
}

function applyTargetsPagination(fixture, searchParams) {
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 24), 1), 100);
  const offset = Math.min(Math.max(Number(searchParams.get("offset") || 0), 0), 10000);
  let candidates = fixture.candidates;
  if (searchParams.get("position") === "PG") {
    const first = candidates[0];
    candidates = Array.from({ length: 25 }, (_, index) => ({
      ...first,
      nba_id: first.nba_id + 1001 + index,
      player_id: first.player_id + 1001 + index,
      name: `Paged candidate ${index + 1}`,
      short_name: `Paged candidate ${index + 1}`,
      position: "PG",
      // Preserve GNFC minutes evidence on every page for Fit pagination tests.
      minutes_trend: first.minutes_trend,
      season_average: first.season_average,
      actionability: first.actionability,
      fit_explanation: first.fit_explanation,
    }));
  }
  const filtered = candidates.length;
  fixture.candidates = candidates.slice(offset, offset + limit);
  fixture.sample.filtered_candidates = filtered;
  fixture.sample.returned = fixture.candidates.length;
  fixture.filters = {
    ...fixture.filters,
    position: searchParams.get("position") || null,
    limit,
    offset,
  };
  return fixture;
}

function targetsFixture(league, membership, managerId, actionScope, selectedCategory = null) {
  const name = league === "gnfc" ? "GNFC Current Form Target" : managerId === 1
    ? `${league.toUpperCase()} Manager A Target`
    : `${league.toUpperCase()} xrtc Target`;
  const strategy_summary = strategySummaryFixture(league);
  const categories = strategy_summary.categories.map((row) => row.key);
  const automaticNeeds = strategy_summary.categories
    .filter((row) => row.classification === "TARGET")
    .map((row) => ({
      key: row.key,
      label: row.label,
      of: league === "gnfc" ? 12 : 20,
      team_rank: row.league_rank,
      team_z: row.z,
      weight: 2,
    }));
  const explicit = typeof selectedCategory === "string" && selectedCategory.length > 0
    ? strategy_summary.categories.find((row) => row.key === selectedCategory)
    : null;
  const need_source = explicit
    ? "user_selected_category"
    : automaticNeeds.length
      ? "system_recommended_strategy"
      : "system_recommended_strategy_no_targets";
  const needs = explicit
    ? [{
      key: explicit.key,
      label: explicit.label,
      of: league === "gnfc" ? 12 : 20,
      team_rank: explicit.league_rank,
      team_z: explicit.z,
      weight: 2,
    }]
    : automaticNeeds;
  const helpLabel = needs[0]?.label ?? "PTS";
  const helpKey = needs[0]?.key ?? "points";
  const readyCandidate = {
    player_id: managerId * 100 + (league === "ldl" ? 1 : 2),
    nba_id: managerId * 1_000 + (league === "ldl" ? 1 : 2),
    name,
    short_name: name,
    nba_team: "ORL",
    nba_team_short: "ORL",
    position: "G",
    photo: null,
    availability: "free_agent",
    fantasy_team: null,
    fit_rank: 1,
    fit_score: managerId === 1 ? 1.25 : 0.85,
    availability_rank: 1,
    availability_of: 80,
    fit_explanation: {
      schema_version: 1, score_kind: "team_need_weighted_player_z", basis_used: "season",
      sample_games: 12, weighted_sum: 2.5, total_weight: 2, score: 1.25,
      contributions_field: "need_contributions", market_rank_separate_from_score: true,
      salary_and_tokens_in_score: false, future_role_and_injury_risk_in_score: false,
    },
    recommendation_reason_codes: ["absolute_category_helper", "controlled_tradeoffs"],
    need_contributions: [{ key: helpKey, label: helpLabel, player_z: 1.25, weight: 2, weighted_contribution: 2.5, verdict: "helps" }],
    confidence: "high",
    recommendation_tier: "strong",
    actionability: {
      status: "ready",
      reasons: [],
      role_signal: "observed_current_minutes",
      cap_result: league === "gnfc" ? "not_applicable" : "within_known_caps",
      roster_result: "open_slot",
    },
    recommendation_labels: ["fixture"],
    helps: [helpLabel, "AST"],
    hurts_needs: [],
    tradeoffs: ["TO"],
    salary_2026_27: league === "gnfc" ? null : "$2,400,000",
    injury: null,
  };
  const reviewCandidate = {
    player_id: 9000 + managerId,
    nba_id: 9000 + managerId,
    name: "Conditional FA",
    short_name: "Conditional FA",
    nba_team: "DET",
    nba_team_short: "DET",
    position: "F",
    photo: null,
    availability: "free_agent",
    fantasy_team: null,
    fit_rank: 2,
    fit_score: 0.7,
    confidence: "medium",
    recommendation_tier: "best_available",
    actionability: {
      status: "needs_review",
      reasons: ["limited_current_minutes"],
      role_signal: "historical_only",
      cap_result: league === "gnfc" ? "not_applicable" : "within_known_caps",
      roster_result: "open_slot",
    },
    need_contributions: [{ key: helpKey, label: helpLabel, player_z: 0.6, weight: 2, weighted_contribution: 1.2, verdict: "helps" }],
    helps: [helpLabel],
    hurts_needs: [],
    tradeoffs: ["AST"],
    salary_2026_27: league === "gnfc" ? null : "$1,000,000",
    injury: null,
  };
  const tradeTarget = {
    player_id: 9100 + managerId,
    nba_id: 9100 + managerId,
    name: "Rostered Trade Target",
    short_name: "Trade Target",
    nba_team: "BOS",
    nba_team_short: "BOS",
    position: "C",
    photo: null,
    availability: "rostered",
    fantasy_team: { id: `${league}-team-b`, name: "Rival Franchise", logo: null },
    fit_rank: 3,
    fit_score: 0.95,
    confidence: "medium",
    recommendation_tier: "strong",
    need_contributions: [{ key: helpKey, label: helpLabel, player_z: 0.9, weight: 2, weighted_contribution: 1.8, verdict: "helps" }],
    helps: [helpLabel, "DREB"],
    hurts_needs: [],
    tradeoffs: ["TO"],
    salary_2026_27: league === "gnfc" ? null : "$8,500,000",
    injury: null,
  };
  const candidates = actionScope === "ready"
    ? [readyCandidate]
    : [readyCandidate, reviewCandidate, tradeTarget];
  return {
    league: { ...leagueFixture(league), categories },
    team: { id: membership.fantrax_team_id, name: membership.franchise_name, logo: null, owner: null },
    basis_requested: "season",
    basis_used: "season",
    fallback_reason: null,
    window: { days: 14, from: "2026-08-27", to: "2026-09-10", season: "2026-27" },
    need_source,
    needs,
    strategy_summary,
    sample: {
      candidate_universe: 100,
      eligible_candidates: 80,
      filtered_candidates: candidates.length,
      returned: candidates.length,
    },
    filters: { availability: league === "gnfc" ? "free_agent" : "all", position: null, limit: 24, offset: 0 },
    acquisition_context: {
      roster_count: 13,
      roster_limit: 14,
      cap_applies: league !== "gnfc",
      cap_season: league === "gnfc" ? null : "2026-27",
    },
    candidates,
    category_recommendations: needs.map((need) => ({
      key: need.key,
      label: need.label,
      free_agent_market: "limited",
      message: "Fixture lane",
      strong_free_agents: [readyCandidate],
      best_available: [reviewCandidate],
      trade_targets: [tradeTarget],
      last_resort: [],
    })),
  };
}

function watchlistPlayerFixture(nbaId, league, availability) {
  const freeAgent = availability === "free_agent";
  return {
    player_id: 40_000 + (nbaId % 10_000),
    fantrax_scorer_id: null,
    name: freeAgent ? `Watched FA ${nbaId}` : `Watched Target ${nbaId}`,
    short_name: freeAgent ? `FA ${nbaId}` : `Target ${nbaId}`,
    nba_team: freeAgent ? "ORL" : "BOS",
    nba_team_short: freeAgent ? "ORL" : "BOS",
    position: freeAgent ? "G" : "F",
    status: freeAgent ? "Free Agent" : "Active",
    photo: null,
    nba_id: nbaId,
    salary_2026_27: null,
    identity_status: "resolved",
    availability,
    fantasy_team: freeAgent ? null : { id: `${league}-team-b`, name: "Rival Franchise", logo: null, owner: "Rival" },
    injury: null,
    window_stats: { games: 3, minutes: 22, fg_pct: 45, three_pm: 1, ft_pct: 80, points: 12, oreb: 1, dreb: 3, assists: 4, steals: 1, blocks: 0, turnovers: 2, assist_turnover: 2 },
    season_average: { games: 20, minutes: 24, fg_pct: 46, three_pm: 1.2, ft_pct: 78, points: 14, oreb: 1, dreb: 4, assists: 5, steals: 1, blocks: 0.5, turnovers: 2, assist_turnover: 2.5 },
    category_trends: {
      PTS: { recent: 16, season: 14, delta: 2, improved: true },
      AST: { recent: 6, season: 5, delta: 1, improved: true },
    },
  };
}

function seedWatchlistEntries(league, subject) {
  // manager-b starts empty so empty-state tests stay meaningful.
  if (subject === "manager-b-subject") return [];
  return [
    {
      id: 1,
      owner_subject: subject,
      league_slug: league,
      nba_player_id: 201001,
      notes: "Trade target — strong rebounder",
      priority: 1,
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-20T12:00:00Z",
      resolved: true,
      player: watchlistPlayerFixture(201001, league, "rostered"),
    },
    {
      id: 2,
      owner_subject: subject,
      league_slug: league,
      nba_player_id: 201002,
      notes: "",
      priority: 2,
      created_at: "2026-10-02T10:00:00Z",
      updated_at: "2026-10-18T09:00:00Z",
      resolved: true,
      player: watchlistPlayerFixture(201002, league, "free_agent"),
    },
    {
      id: 3,
      owner_subject: subject,
      league_slug: league,
      nba_player_id: 201003,
      notes: "Watch minutes after injury return",
      priority: 3,
      created_at: "2026-10-03T10:00:00Z",
      updated_at: "2026-10-19T08:00:00Z",
      resolved: true,
      player: {
        ...watchlistPlayerFixture(201003, league, "free_agent"),
        name: "Watched Minutes Watch",
        position: "C",
        nba_team: "DET",
        injury: {
          status: "Questionable",
          body_part: "Ankle",
          detail: "Left ankle sprain",
          source: "fixture",
          updated_at: "2026-10-25T12:00:00Z",
        },
      },
    },
  ];
}

function freeAgentRadarFixture(league) {
  const categories = ["points", "rebounds", "assists", "steals", "blocks"];
  const players = [
    {
      player_id: 21001, nba_id: 21001, name: "Radar Test Player", nba_team: "ORL", nba_team_short: "ORL",
      position: "G", photo: null, salary_2026_27: null, status: "Free Agent", short_name: "Test Player",
      fantrax_scorer_id: null, identity_status: "resolved", availability: "free_agent", fantasy_team: null, injury: null,
      window_stats: { games: 4, minutes: 28, fg_pct: 48, three_pm: 2, ft_pct: 82, points: 18, oreb: 1, dreb: 3, assists: 6, steals: 1.5, blocks: 0, turnovers: 2, assist_turnover: 3 },
      season_average: { games: 20, minutes: 22, fg_pct: 45, three_pm: 1.5, ft_pct: 80, points: 14, oreb: 1, dreb: 3, assists: 4, steals: 1, blocks: 0, turnovers: 2, assist_turnover: 2 },
      recent_average: { games: 4, minutes: 28, fg_pct: 48, three_pm: 2, ft_pct: 82, points: 18, oreb: 1, dreb: 3, assists: 6, steals: 1.5, blocks: 0, turnovers: 2, assist_turnover: 3 },
      trend_rank: 1, trend_score: 1.45, trend_confidence: "high", trend_strengths: ["PTS", "AST"],
      minutes_trend: {
        basis: "completed_game_logs", season: "2026-27", previous_season: "2025-26",
        state: "increase", sample_games: 4, minutes: 28, previous_minutes: 18,
        delta_minutes: 10, delta_percent: 55.6, previous_games: 65, latest_game_date: "2026-10-24",
      },
      category_trends: {
        PTS: { recent: 18, season: 14, delta: 4, improved: true },
        AST: { recent: 6, season: 4, delta: 2, improved: true },
        REB: { recent: 4, season: 4, delta: 0, improved: false },
      },
      trend_explanation: {
        schema_version: 1, score_kind: "recent_vs_season_category_trend", status: "scored",
        reason_code: "recent_vs_season_standardized_category_deltas",
        recent_games: 4, season_games: 20, minimum_recent_games: 2, score: 1.45,
        category_contributions: [
          { key: "points", label: "PTS", standardized_delta: 1.1, recent: 18, season: 14 },
          { key: "assists", label: "AST", standardized_delta: 0.35, recent: 6, season: 4 },
        ],
        team_need_fit_in_score: false, salary_and_tokens_in_score: false,
      },
    },
    {
      player_id: 21002, nba_id: 21002, name: "Radar Hot Forward", nba_team: "DET", nba_team_short: "DET",
      position: "F", photo: null, salary_2026_27: null, status: "Free Agent", short_name: "Hot Forward",
      fantrax_scorer_id: null, identity_status: "resolved", availability: "free_agent", fantasy_team: null, injury: null,
      window_stats: { games: 3, minutes: 30, fg_pct: 52, three_pm: 1, ft_pct: 75, points: 16, oreb: 2, dreb: 7, assists: 2, steals: 1, blocks: 1, turnovers: 1.5, assist_turnover: 1.3 },
      season_average: { games: 18, minutes: 24, fg_pct: 48, three_pm: 0.8, ft_pct: 74, points: 12, oreb: 1.5, dreb: 5, assists: 1.5, steals: 0.8, blocks: 0.7, turnovers: 1.5, assist_turnover: 1 },
      recent_average: { games: 3, minutes: 30, fg_pct: 52, three_pm: 1, ft_pct: 75, points: 16, oreb: 2, dreb: 7, assists: 2, steals: 1, blocks: 1, turnovers: 1.5, assist_turnover: 1.3 },
      trend_rank: 2, trend_score: 1.05, trend_confidence: "medium", trend_strengths: ["REB", "BLK"],
      minutes_trend: {
        basis: "completed_game_logs", season: "2026-27", previous_season: "2025-26",
        state: "early_increase", sample_games: 3, minutes: 30, previous_minutes: 20,
        delta_minutes: 10, delta_percent: 50, previous_games: 50, latest_game_date: "2026-10-23",
      },
      category_trends: {
        REB: { recent: 9, season: 6.5, delta: 2.5, improved: true },
        BLK: { recent: 1, season: 0.7, delta: 0.3, improved: true },
        PTS: { recent: 16, season: 12, delta: 4, improved: true },
      },
      trend_explanation: {
        schema_version: 1, score_kind: "recent_vs_season_category_trend", status: "scored",
        reason_code: "recent_vs_season_standardized_category_deltas",
        recent_games: 3, season_games: 18, minimum_recent_games: 2, score: 1.05,
        category_contributions: [
          { key: "rebounds", label: "REB", standardized_delta: 0.7, recent: 9, season: 6.5 },
          { key: "points", label: "PTS", standardized_delta: 0.35, recent: 16, season: 12 },
        ],
        team_need_fit_in_score: false, salary_and_tokens_in_score: false,
      },
    },
    {
      player_id: 21003, nba_id: 21003, name: "Radar Cooling Center", nba_team: "CHA", nba_team_short: "CHA",
      position: "C", photo: null, salary_2026_27: null, status: "Free Agent", short_name: "Cooling Center",
      fantrax_scorer_id: null, identity_status: "resolved", availability: "free_agent", fantasy_team: null, injury: null,
      window_stats: { games: 4, minutes: 18, fg_pct: 50, three_pm: 0, ft_pct: 70, points: 8, oreb: 2, dreb: 5, assists: 1, steals: 0.5, blocks: 1, turnovers: 1, assist_turnover: 1 },
      season_average: { games: 22, minutes: 26, fg_pct: 55, three_pm: 0, ft_pct: 72, points: 12, oreb: 2.5, dreb: 6, assists: 1.2, steals: 0.6, blocks: 1.4, turnovers: 1.2, assist_turnover: 1 },
      recent_average: { games: 4, minutes: 18, fg_pct: 50, three_pm: 0, ft_pct: 70, points: 8, oreb: 2, dreb: 5, assists: 1, steals: 0.5, blocks: 1, turnovers: 1, assist_turnover: 1 },
      trend_rank: 3, trend_score: -0.55, trend_confidence: "medium", trend_strengths: [],
      minutes_trend: {
        basis: "completed_game_logs", season: "2026-27", previous_season: "2025-26",
        state: "decrease", sample_games: 4, minutes: 18, previous_minutes: 26,
        delta_minutes: -8, delta_percent: -30.8, previous_games: 70, latest_game_date: "2026-10-22",
      },
      category_trends: {
        PTS: { recent: 8, season: 12, delta: -4, improved: false },
        BLK: { recent: 1, season: 1.4, delta: -0.4, improved: false },
      },
      trend_explanation: {
        schema_version: 1, score_kind: "recent_vs_season_category_trend", status: "scored",
        reason_code: "recent_vs_season_standardized_category_deltas",
        recent_games: 4, season_games: 22, minimum_recent_games: 2, score: -0.55,
        category_contributions: [
          { key: "points", label: "PTS", standardized_delta: -0.4, recent: 8, season: 12 },
          { key: "blocks", label: "BLK", standardized_delta: -0.15, recent: 1, season: 1.4 },
        ],
        team_need_fit_in_score: false, salary_and_tokens_in_score: false,
      },
    },
  ];
  return {
    league: leagueFixture(league),
    generated_at: "2026-10-25T12:00:00Z",
    source: "database_cache",
    window: { days: 7, from: "2026-10-18", to: "2026-10-25", season: "2026-27" },
    minimum_games: 2,
    categories,
    method: "recent_vs_season_category_trend",
    players,
  };
}

function accessToken(subject, user) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", kid: keyId, typ: "JWT" });
  const payload = encode({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 3_600,
    iss: issuer,
    sub: subject,
    email: user.email,
    name: user.display_name,
  });
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey)
    .toString("base64url");
  return `${header}.${payload}.${signature}`;
}

server.listen(3101, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
