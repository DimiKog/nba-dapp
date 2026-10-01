import assert from "node:assert/strict";
import { test } from "node:test";
import { overallDetail } from "../lib/playerIntelligenceFormat.ts";

test("a player with no games and a null score keeps a readable profile detail", () => {
  const sample = { qualified: false, overall: { z_score: null } };
  assert.equal(overallDetail(sample, "nba"), "No combined impact yet");
  assert.equal(overallDetail(sample, "market"), "No combined impact yet");
  assert.equal(overallDetail({ qualified: false, overall: null }, "nba"), "No combined impact yet");
});

test("a scored player still shows the formatted impact", () => {
  const sample = { qualified: true, overall: { z_score: 1.235 } };
  assert.equal(overallDetail(sample, "nba"), "Combined impact · +1.24 z");
  assert.equal(overallDetail(sample, "market"), "Ranked within availability market");
  assert.equal(overallDetail({ qualified: true, overall: { z_score: null } }, "nba"), "No combined neutral score");
});
