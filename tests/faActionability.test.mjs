import assert from "node:assert/strict";
import { test } from "node:test";
import { roleEvidenceSummary, selectReadyFreeAgent } from "../lib/faActionability.ts";

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

test("historical limited minutes are not described as a current projection", () => {
  const summary = roleEvidenceSummary({
    status: "needs_review",
    role_signal: "historical_only",
    role_evidence: {
      season: "2025-26", scope: "historical", games: 53,
      minutes: 11, finding: "limited_observed_minutes",
    },
  });
  assert.match(summary, /53 GP · 11\.0 min\/game/);
  assert.match(summary, /Limited past minutes/);
  assert.match(summary, /not a projection/);
});

test("current observed minutes remain evidence rather than a guarantee", () => {
  const summary = roleEvidenceSummary({
    status: "ready",
    role_signal: "observed_current_minutes",
    role_evidence: {
      season: "2026-27", scope: "current", games: 8,
      minutes: 24, finding: "observed_rotation_minutes",
    },
  });
  assert.match(summary, /current minutes meet/i);
  assert.match(summary, /not a future guarantee/);
});
