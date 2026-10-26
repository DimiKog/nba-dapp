import assert from "node:assert/strict";
import test from "node:test";
import { rosterPerGameStats } from "../lib/rosterPerGameStats.ts";

test("recent counting totals become per-game averages without changing rates or totals", () => {
  const totals = {
    games: 3, minutes: 90, points: 61, rebounds: 24, three_pm: 8,
    oreb: 6, dreb: 18, assists: 17, steals: 5, blocks: 2, turnovers: 4,
    fgm: 22, fga: 45, ftm: 9, fta: 12, fg_pct: 48.9, ft_pct: 75,
    assist_turnover: 4.25,
  };
  const average = rosterPerGameStats(totals);
  for (const key of ["minutes", "points", "rebounds", "three_pm", "oreb", "dreb", "assists", "steals", "blocks", "turnovers", "fgm", "fga", "ftm", "fta"]) {
    assert.equal(average[key], totals[key] / 3, key);
  }
  assert.equal(average.games, 3);
  assert.equal(average.fg_pct, totals.fg_pct);
  assert.equal(average.ft_pct, totals.ft_pct);
  assert.equal(average.assist_turnover, totals.assist_turnover);
  assert.equal(totals.points, 61);
});

test("empty recent window remains unchanged and is never divided by zero", () => {
  const empty = {
    games: 0, points: 0, three_pm: 0, oreb: 0, dreb: 0,
    assists: 0, steals: 0, blocks: 0, turnovers: 0,
    fg_pct: null, ft_pct: null, assist_turnover: null,
  };
  assert.equal(rosterPerGameStats(empty), empty);
});
