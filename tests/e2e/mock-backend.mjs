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
      membership("bdb", "bdb-franchise-a", "Manager A BDB", "bdb-team-a", false),
    ],
  },
  "manager-b-subject": {
    user: { id: 2, email: "manager-b@example.test", display_name: "Bob Example" },
    memberships: [
      membership("ldl", "ldl-franchise-b", "xrtc", "ldl-team-b", false),
      membership("bdb", "bdb-franchise-b", "xrtc", "bdb-team-b", false),
    ],
  },
};

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

function send(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sessionFor(request) {
  return sessions[request.headers["x-fantasy-identity-subject"]] ?? null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3101");

  if (url.pathname === "/api/health") {
    return send(response, 200, { status: "ok" });
  }
  if (url.pathname === "/cdn-cgi/access/certs") {
    return send(response, 200, { keys: [publicJwk] });
  }
  if (url.pathname === "/test/access-token") {
    const subject = url.searchParams.get("subject");
    const session = subject ? sessions[subject] : null;
    return session
      ? send(response, 200, { token: accessToken(subject, session.user) })
      : send(response, 404, { error: "Unknown test identity" });
  }
  if (url.pathname === "/api/fantasy/session") {
    const session = sessionFor(request);
    return session
      ? send(response, 200, session)
      : send(response, 401, { error: "Unknown test identity" });
  }
  const researchMatch = url.pathname.match(/^\/api\/nba\/players\/by-nba-id\/(\d+)\/research$/);
  if (researchMatch) {
    const session = sessionFor(request);
    if (!session) return send(response, 401, { error: "Unknown test identity" });
    const nbaId = Number(researchMatch[1]);
    return send(response, 200, playerResearchFixture(nbaId));
  }
  if (url.pathname === "/api/nba/scoreboard" || url.pathname === "/api/nba/news") {
    return send(response, 200, []);
  }
  if (/^\/api\/fantasy\/(ldl|bdb)\/standings$/.test(url.pathname)) {
    return send(response, 200, []);
  }
  if (/^\/api\/fantasy\/(ldl|bdb)\/free-agent-radar$/.test(url.pathname)) {
    return send(response, 200, {
      league: { slug: url.pathname.includes("/bdb/") ? "bdb" : "ldl", name: "Test league" },
      categories: [],
      players: [],
    });
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
    return send(response, 200, rosterPerformanceFixture(league, membership, incomplete));
  }
  const profileMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/roster\/([^/]+)\/category-profile$/);
  if (profileMatch) {
    const [, league, teamId] = profileMatch;
    const membership = membershipByTeam(league, teamId);
    if (!membership) return send(response, 403, { error: "Not your team" });
    return send(response, 200, categoryProfileFixture(league, membership));
  }
  const targetsMatch = url.pathname.match(/^\/api\/fantasy\/(ldl|bdb)\/roster\/([^/]+)\/targets$/);
  if (targetsMatch) {
    const [, league, teamId] = targetsMatch;
    const session = sessionFor(request);
    const membership = session?.memberships.find((item) => (
      item.league_slug === league && item.fantrax_team_id === teamId
    ));
    if (!membership) return send(response, 403, { error: "Not your team" });
    return send(response, 200, targetsFixture(league, membership, session.user.id));
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

  send(response, 404, { error: `No E2E fixture for ${url.pathname}` });
});

function leagueFixture(slug) {
  return {
    slug,
    name: slug === "ldl" ? "LDL" : "BδB",
    league_id: `${slug}-league`,
    personal_team_id: "global-config-must-not-be-used",
    personal_team_name: "Global config must not be used",
    enabled: true,
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
      nba_team: "Test Team",
      nba_team_short: "TST",
      position: "G",
      photo: null,
      fantasy_team: null,
      injury: index === 0 && membership.fantrax_team_id.endsWith("-a")
        ? { status: "GTD", body_part: "ankle", detail: null, source: "fixture", updated_at: null }
        : null,
      latest_game: null,
      window_stats: { games: 0 },
      season_average: null,
      category_strengths: [],
      impact_rank: null,
      impact_score: null,
      freshness: { roster: null, stats: null, injury: null },
    })),
  };
}

function categoryProfileFixture(league, membership) {
  return {
    league: leagueFixture(league),
    team: { id: membership.fantrax_team_id, name: membership.franchise_name, logo: null, owner: null },
    basis_requested: "season",
    basis_used: "season",
    scope: "roster_rate",
    window: { days: 14, from: "2026-08-27", to: "2026-09-10", season: "2026-27" },
    snapshot: { captured_at: "2026-09-10T08:00:00Z", generated_at: "2026-09-10T08:01:00Z", source: "database_cache" },
    sample: { league_teams: 14, players_included: 14, players_missing_stats: 0, league_players_included: { minimum: 13, maximum: 14, average: 14 } },
    categories: [],
    weaknesses: ["FT%", "TO"],
    strengths: ["3PTM", "AST"],
    severe_weaknesses: [],
    method: { ranking: "fixture", ratios: "fixture", turnovers: "fixture", window_scope: "fixture" },
  };
}

function targetsFixture(league, membership, managerId) {
  const name = managerId === 1
    ? `${league.toUpperCase()} Manager A Target`
    : `${league.toUpperCase()} xrtc Target`;
  return {
    league: leagueFixture(league),
    team: { id: membership.fantrax_team_id, name: membership.franchise_name, logo: null, owner: null },
    basis_requested: "season",
    basis_used: "season",
    fallback_reason: null,
    window: { days: 14, from: "2026-08-27", to: "2026-09-10", season: "2026-27" },
    need_source: "profile_weaknesses",
    needs: [],
    sample: { candidate_universe: 100, eligible_candidates: 80, filtered_candidates: 80, returned: 1 },
    filters: { availability: "free_agent", position: null, limit: 12 },
    candidates: [{
      player_id: managerId * 100 + (league === "ldl" ? 1 : 2),
      nba_id: managerId * 1_000 + (league === "ldl" ? 1 : 2),
      name,
      short_name: name,
      nba_team: "Test Team",
      nba_team_short: "TST",
      position: "G",
      photo: null,
      availability: "free_agent",
      fantasy_team: null,
      fit_rank: 1,
      fit_score: managerId === 1 ? 1.25 : 0.85,
      confidence: "high",
      recommendation_tier: "strong",
      recommendation_labels: ["fixture"],
      helps: ["FT%", "AST"],
      hurts_needs: [],
      tradeoffs: ["TO"],
      salary_2026_27: null,
      injury: null,
    }],
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
