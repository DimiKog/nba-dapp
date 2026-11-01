import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  isPlayerDetailLeagueSlug,
  isPlayerDetailOutlookLeague,
  parsePlayerDetailLeagueSlug,
  PLAYER_DETAIL_LEAGUE_SLUGS,
  playerDetailLeagueLabel,
} from "../lib/playerDetailLeagues.ts";
import { isLeagueSlug, LEAGUE_SLUGS } from "../lib/leagues.ts";

test("Player Detail accepts GNFC without remapping to LDL or BDB", () => {
  assert.deepEqual([...PLAYER_DETAIL_LEAGUE_SLUGS], ["ldl", "bdb", "gnfc"]);
  assert.equal(parsePlayerDetailLeagueSlug("gnfc"), "gnfc");
  assert.equal(isPlayerDetailLeagueSlug("gnfc"), true);
  assert.equal(playerDetailLeagueLabel("gnfc"), "GNFC");
  assert.equal(parsePlayerDetailLeagueSlug("ldl"), "ldl");
  assert.equal(parsePlayerDetailLeagueSlug("bdb"), "bdb");
  assert.equal(parsePlayerDetailLeagueSlug("nba"), null);
  assert.equal(parsePlayerDetailLeagueSlug(undefined), null);
});

test("legacy LEAGUE_SLUGS storage remains LDL/BDB-only", () => {
  assert.deepEqual([...LEAGUE_SLUGS], ["ldl", "bdb"]);
  assert.equal(isLeagueSlug("gnfc"), false);
  assert.equal(isPlayerDetailOutlookLeague("gnfc"), false);
  assert.equal(isPlayerDetailOutlookLeague("ldl"), true);
  assert.equal(isPlayerDetailOutlookLeague("bdb"), true);
});

test("Player Detail page and dashboard wire GNFC context without fantasy salary/cap copy", () => {
  const page = readFileSync(new URL("../app/players/[id]/page.tsx", import.meta.url), "utf8");
  const dashboard = readFileSync(
    new URL("../components/PlayerIntelligenceDashboard.tsx", import.meta.url),
    "utf8",
  );
  const api = readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8");

  assert.match(page, /parsePlayerDetailLeagueSlug/);
  assert.doesNotMatch(page, /isLeagueSlug\(query\.league\)/);
  assert.match(api, /league\?: "ldl" \| "bdb" \| "gnfc"/);
  assert.match(dashboard, /PLAYER_DETAIL_LEAGUE_SLUGS/);
  assert.match(dashboard, /NBA contract/);
  assert.match(dashboard, /NBA salary timeline/);
  assert.match(dashboard, /2026–27 NBA salary/);
  assert.doesNotMatch(dashboard, /GNFC salary/);
  assert.doesNotMatch(dashboard, /fantasy salary/);
  assert.doesNotMatch(dashboard, /salary cap/i);
  assert.match(dashboard, /isPlayerDetailOutlookLeague\(league\)/);
  assert.match(dashboard, /data-player-league=\{league \?\? "nba"\}/);
});
