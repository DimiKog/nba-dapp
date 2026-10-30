import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { sortWatchlistEntries, priorityLabel } from "../lib/watchlistClient.ts";

test("sortWatchlistEntries orders by priority ascending then updated_at descending", () => {
  const entries = [
    { nba_player_id: 3, priority: 3, updated_at: "2026-10-20T10:00:00Z" },
    { nba_player_id: 1, priority: 1, updated_at: "2026-10-10T10:00:00Z" },
    { nba_player_id: 2, priority: 1, updated_at: "2026-10-18T10:00:00Z" },
    { nba_player_id: 4, priority: 2, updated_at: "2026-10-19T10:00:00Z" },
  ];
  const sorted = sortWatchlistEntries(entries);
  assert.deepEqual(
    sorted.map((e) => e.nba_player_id),
    [2, 1, 4, 3],
  );
});

test("priorityLabel maps 1/2/3 to High/Medium/Low", () => {
  assert.equal(priorityLabel(1), "High");
  assert.equal(priorityLabel(2), "Medium");
  assert.equal(priorityLabel(3), "Low");
});

test("Discovery Watched and FA Trends views mount real functionality, not placeholders", () => {
  const watched = readFileSync(
    new URL("../components/discovery/DiscoveryWatchedView.tsx", import.meta.url),
    "utf8",
  );
  const fa = readFileSync(
    new URL("../components/discovery/DiscoveryFaTrendsView.tsx", import.meta.url),
    "utf8",
  );
  const placeholder = readFileSync(
    new URL("../components/discovery/DiscoveryViewPlaceholder.tsx", import.meta.url),
    "utf8",
  );

  assert.match(watched, /fetchFantasyWatchlist/);
  assert.match(watched, /No watched players yet/);
  assert.match(watched, /data-testid="discovery-watched"/);
  assert.doesNotMatch(watched, /being consolidated/);
  assert.doesNotMatch(watched, /Roster Watch/);

  assert.match(fa, /free-agent-radar/);
  assert.match(fa, /data-testid="discovery-fa-trends"/);
  assert.match(fa, /Free-agent market data is not ready/);
  assert.doesNotMatch(fa, /being consolidated/);
  assert.doesNotMatch(fa, /TARGET/);
  assert.doesNotMatch(fa, /My watchlist/);
  assert.doesNotMatch(fa, /team.?need/i);

  // Placeholders remain only for Fit (and browse-pending for GNFC).
  assert.match(placeholder, /Fit to my plan is being consolidated/);
});

test("WatchlistRadar combined page is retired; shared watch client exists", () => {
  let missing = false;
  try {
    readFileSync(new URL("../components/WatchlistRadar.tsx", import.meta.url), "utf8");
  } catch {
    missing = true;
  }
  assert.equal(missing, true);

  const client = readFileSync(
    new URL("../lib/watchlistClient.ts", import.meta.url),
    "utf8",
  );
  assert.match(client, /upsertWatchlistEntry/);
  assert.match(client, /removeWatchlistEntry/);
  assert.match(client, /sortWatchlistEntries/);
});

test("API client watchlist and radar typing include GNFC without remapping", () => {
  const api = readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8");
  assert.match(api, /fetchFreeAgentRadar\(\s*league: "ldl" \| "bdb" \| "gnfc"/);
  assert.match(api, /fetchFantasyWatchlist\(\s*league: "ldl" \| "bdb" \| "gnfc"/);
  assert.doesNotMatch(api, /gnfc.*ldl|remap.*gnfc/i);
});
