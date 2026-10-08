import assert from "node:assert/strict";
import { test } from "node:test";
import { selectReadyFreeAgent } from "../lib/faActionability.ts";

const candidate = (name, status, tier = "strong") => ({
  name,
  availability: "free_agent",
  recommendation_tier: tier,
  ...(status ? { actionability: { status } } : {}),
});

test("home shortcut does not promote a historical statistical fit", () => {
  const targets = {
    candidates: [candidate("Prosper", "needs_review"), candidate("Unassessed", null)],
    category_recommendations: [{
      strong_free_agents: [candidate("Prosper", "needs_review")],
      best_available: [],
    }],
  };
  assert.equal(selectReadyFreeAgent(targets), null);
});

test("home shortcut selects a checked candidate ahead of conditional options", () => {
  const checked = candidate("Checked player", "ready", "best_available");
  const targets = {
    candidates: [candidate("Prosper", "requires_move"), checked],
    category_recommendations: [],
  };
  assert.equal(selectReadyFreeAgent(targets), checked);
});
