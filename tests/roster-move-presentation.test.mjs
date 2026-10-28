import assert from "node:assert/strict";
import { test } from "node:test";
import {
  acquisitionReasonLabel,
  flattenDiscoveryRecommendations,
  hasProtectDamage,
  headlineStatus,
  INITIAL_RECOMMENDATION_COUNT,
  isRawEngineCode,
  pairFeasibilityLabel,
  protectDamageLabel,
  targetImpactDisplays,
  targetImprovementLines,
  visibleRecommendations,
} from "../lib/rosterMovePresentation.ts";

function move(overrides = {}) {
  return {
    tier: "tier_1_target_ready",
    pair_feasibility: { status: "needs_review", reasons: ["current_role_unverified"] },
    remove_player: { nba_id: 1, name: "Tim Hardaway Jr." },
    add_player: {
      nba_id: 2,
      name: "Jordan Goodwin",
      observed: { games: 3 },
      contribution_basis: { resolution: "blended" },
      actionability: { status: "needs_review", reasons: ["current_role_unverified"] },
    },
    target: { improved: ["oreb", "assist_turnover"], declined: [] },
    protect: { improved: [], preserved: ["points"], damaged: [] },
    meaningful_transitions: [
      {
        key: "oreb",
        classification: "TARGET",
        transition: "improved",
        // backend: before_rank - after_rank; positive = places gained
        rank_delta: 5,
        z_delta: 0.4,
      },
      {
        key: "assist_turnover",
        classification: "TARGET",
        transition: "improved",
        rank_delta: 2,
        z_delta: 0.2,
      },
    ],
    salary_cap: { applies: true, verified: true, delta: -200_000 },
    ...overrides,
  };
}

test("flatten uses UI presentation tier order and preserves within-tier returned order", () => {
  // Cross-tier sequence is DISCOVERY_TIER_ORDER (UI policy), not a backend global rank.
  // Within each tier, `returned` order is left unchanged.
  const discovery = {
    tiers: {
      tier_2_target_needs_review: {
        returned: [move({ tier: "tier_2_target_needs_review", add_player: { nba_id: 20, name: "B" }, remove_player: { nba_id: 10 } })],
      },
      tier_1_target_ready: {
        returned: [
          move({ add_player: { nba_id: 2, name: "First" }, remove_player: { nba_id: 1 } }),
          move({ add_player: { nba_id: 3, name: "Second" }, remove_player: { nba_id: 1 } }),
        ],
      },
      tier_blocked: {
        returned: [move({ tier: "tier_blocked", add_player: { nba_id: 99, name: "Blocked" }, remove_player: { nba_id: 1 } })],
      },
      tier_other: {
        returned: [move({ tier: "tier_other", add_player: { nba_id: 50, name: "Other" }, remove_player: { nba_id: 1 } })],
      },
    },
  };
  const flat = flattenDiscoveryRecommendations(discovery);
  assert.deepEqual(
    flat.map((item) => item.add_player.nba_id),
    [2, 3, 20, 50, 99],
  );
});

test("top 3 only initially; view all reveals remaining", () => {
  const moves = [1, 2, 3, 4, 5].map((nbaId) =>
    move({ add_player: { nba_id: nbaId, name: `FA ${nbaId}` }, remove_player: { nba_id: 100 + nbaId } }),
  );
  assert.equal(INITIAL_RECOMMENDATION_COUNT, 3);
  assert.deepEqual(
    visibleRecommendations(moves, false).map((item) => item.add_player.nba_id),
    [1, 2, 3],
  );
  assert.deepEqual(
    visibleRecommendations(moves, true).map((item) => item.add_player.nba_id),
    [1, 2, 3, 4, 5],
  );
});

test("empty discovery flattens to empty list", () => {
  assert.deepEqual(flattenDiscoveryRecommendations({ tiers: {} }), []);
  assert.deepEqual(flattenDiscoveryRecommendations(null), []);
});

test("TARGET improvements use places from positive rank_delta without inventing ranks", () => {
  const rows = targetImpactDisplays(move());
  assert.equal(rows[0].label, "OREB");
  assert.equal(rows[0].improved, true);
  assert.equal(rows[0].beforeRank, null);
  assert.equal(rows[0].afterRank, null);
  assert.equal(rows[0].places, 5);
  assert.equal(rows[0].fallbackLine, "OREB · +5 places");
  assert.deepEqual(targetImprovementLines(move()), [
    "OREB · +5 places",
    "A/TO · +2 places",
  ]);
});

test("TARGET impact shows explicit before → after ranks when both are present", () => {
  const rows = targetImpactDisplays(move({
    meaningful_transitions: [{
      key: "oreb",
      classification: "TARGET",
      transition: "improved",
      rank_delta: 5,
      before_league_rank: 11,
      after_league_rank: 6,
    }],
    target: { improved: ["oreb"], declined: [] },
  }));
  assert.equal(rows[0].beforeRank, 11);
  assert.equal(rows[0].afterRank, 6);
  assert.equal(rows[0].places, 5);
  assert.equal(rows[0].improved, true);
  assert.equal(
    targetImprovementLines(move({
      meaningful_transitions: [{
        key: "oreb",
        classification: "TARGET",
        transition: "improved",
        rank_delta: 5,
        before_league_rank: 11,
        after_league_rank: 6,
      }],
      target: { improved: ["oreb"], declined: [] },
    }))[0],
    "OREB #11 → #6 · +5 places",
  );
});

test("TARGET worsening uses negative places language without inventing ranks", () => {
  const rows = targetImpactDisplays(move({
    target: { improved: ["oreb"], declined: [] },
    meaningful_transitions: [{
      key: "oreb",
      classification: "TARGET",
      transition: "declined",
      rank_delta: -3,
    }],
  }));
  assert.equal(rows[0].improved, false);
  assert.equal(rows[0].fallbackLine, "OREB · −3 places");
});

test("TARGET falls back honestly when rank data is missing", () => {
  const rows = targetImpactDisplays(move({
    meaningful_transitions: [{
      key: "oreb",
      classification: "TARGET",
      transition: "improved",
    }],
    target: { improved: ["oreb"], declined: [] },
  }));
  assert.equal(rows[0].fallbackLine, "OREB improved");
  assert.equal(rows[0].beforeRank, null);
  assert.equal(rows[0].afterRank, null);
  assert.equal(rows[0].places, null);
});

test("no PROTECT damage is communicated clearly", () => {
  assert.equal(hasProtectDamage(move()), false);
  assert.equal(protectDamageLabel(move()), "No PROTECT categories damaged");
});

test("PROTECT damage is communicated when present", () => {
  const damaged = move({
    protect: { improved: [], preserved: [], damaged: ["points", "steals"] },
  });
  assert.equal(hasProtectDamage(damaged), true);
  assert.equal(protectDamageLabel(damaged), "PROTECT damaged: PTS, ST");
});

test("needs_review translates to user-facing promising language", () => {
  assert.equal(pairFeasibilityLabel("needs_review"), "Promising · Review details");
  assert.equal(headlineStatus(move()), "Promising · Verify role");
  assert.equal(isRawEngineCode(headlineStatus(move())), false);
});

test("injury review translates appropriately and is not a raw primary label", () => {
  assert.equal(acquisitionReasonLabel("injury_review_required"), "Check injury/status");
  const injured = move({
    pair_feasibility: {
      status: "needs_review",
      reasons: ["injury_review_required"],
    },
    add_player: {
      nba_id: 2,
      name: "Injured FA",
      actionability: { reasons: ["injury_review_required"] },
    },
  });
  const headline = headlineStatus(injured);
  assert.equal(headline, "Promising · Check injury/status");
  assert.equal(headline.includes("injury_review_required"), false);
  assert.equal(isRawEngineCode(headline), false);
});

test("feasible and blocked map to conservative product language", () => {
  assert.equal(pairFeasibilityLabel("feasible"), "Ready to consider");
  assert.equal(pairFeasibilityLabel("blocked"), "Not currently viable");
  assert.equal(pairFeasibilityLabel("economically_unverified"), "Verify salary");
});

test("raw engine reason codes are detectable and not used as mapped labels", () => {
  assert.equal(isRawEngineCode("current_role_unverified"), true);
  assert.equal(isRawEngineCode("Verify role"), false);
  assert.notEqual(acquisitionReasonLabel("current_role_unverified"), "current_role_unverified");
});
