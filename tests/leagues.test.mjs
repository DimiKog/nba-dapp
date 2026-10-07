import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isLeagueSlug,
  LEAGUE_PRESENTATION,
  LEAGUE_SLUGS,
  leagueLabel,
  leaguePresentation,
  parseLeagueSlug,
  resolveClientLeague,
} from "../lib/leagues.ts";

test("the existing leagues keep their labels, order and presentation features", () => {
  assert.deepEqual(LEAGUE_SLUGS, ["ldl", "bdb"]);
  assert.equal(leagueLabel("ldl"), "LDL");
  assert.equal(leagueLabel("bdb"), "BδB");
  assert.deepEqual(LEAGUE_PRESENTATION.ldl, {
    label: "LDL",
    showTenure: true,
    showClaimTokens: false,
    scoreboardPlayerClasses: "border-cyan-500 bg-cyan-50 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-200",
  });
  assert.deepEqual(LEAGUE_PRESENTATION.bdb, {
    label: "BδB",
    showTenure: false,
    showClaimTokens: true,
    scoreboardPlayerClasses: "border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200",
  });
});

test("unknown slugs never receive league-specific presentation features", () => {
  for (const value of ["third", "", null, undefined]) {
    assert.equal(isLeagueSlug(value), false);
    assert.equal(leaguePresentation(value), null);
  }
  assert.equal(isLeagueSlug("ldl"), true);
  assert.equal(isLeagueSlug("bdb"), true);
});

test("existing fallback behaviour remains unchanged", () => {
  assert.equal(parseLeagueSlug("third"), "ldl");
  assert.equal(resolveClientLeague("third", "bdb"), "bdb");
  assert.equal(resolveClientLeague("ldl", "bdb"), "ldl");
});
