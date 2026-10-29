import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatLookItems,
  groupRecommendedStrategy,
  selectNeedsAttentionCategories,
  selectPuntCandidateCategories,
  selectStrongestCategories,
  strategyGroupLabel,
} from "../lib/teamIntelligencePresentation.ts";

function category(partial) {
  return {
    key: partial.key,
    label: partial.label ?? partial.key.toUpperCase(),
    value: partial.value ?? 1,
    league_rank: partial.league_rank ?? null,
    eligible_teams: partial.eligible_teams ?? 20,
    percentile: partial.percentile ?? null,
    league_mean: partial.league_mean ?? 0,
    z: partial.z ?? null,
    verdict: partial.verdict,
    sample: null,
  };
}

function profile(categories) {
  return {
    categories,
    strengths: [],
    weaknesses: [],
    severe_weaknesses: [],
  };
}

test("strongest prefers strength verdicts ordered by league rank", () => {
  const items = selectStrongestCategories(profile([
    category({ key: "blocks", label: "BLK", league_rank: 6, z: 0.65, verdict: "strength" }),
    category({ key: "assists", label: "AST", league_rank: 1, z: 1.4, verdict: "strength" }),
    category({ key: "steals", label: "STL", league_rank: 1, z: 1.2, verdict: "strength" }),
    category({ key: "three_pm", label: "3PTM", league_rank: 2, z: 1.0, verdict: "strength" }),
    category({ key: "oreb", label: "OREB", league_rank: 16, z: -0.8, verdict: "weakness" }),
  ]));
  assert.deepEqual(formatLookItems(items), "AST #1 · STL #1 · 3PTM #2");
});

test("needs attention uses backend TARGET rows in backend order", () => {
  assert.deepEqual(selectNeedsAttentionCategories(null), []);
  const items = selectNeedsAttentionCategories({
    categories: [
      { key: "assists", label: "AST", classification: "PROTECT" },
      { key: "oreb", label: "OREB", classification: "TARGET" },
      { key: "assist_turnover", label: "A/TO", classification: "TARGET" },
      { key: "turnovers", label: "TO", classification: "PUNT_CANDIDATE" },
      { key: "fg_pct", label: "FG%", classification: "FLEX" },
    ],
  });
  assert.deepEqual(formatLookItems(items), "OREB · A/TO");
});

test("needs attention does not use profile weaknesses or invent classifications", () => {
  const items = selectNeedsAttentionCategories({
    categories: [
      { key: "turnovers", label: "TO", classification: "PUNT_CANDIDATE" },
      { key: "oreb", label: "OREB", classification: "TARGET" },
    ],
  });
  assert.deepEqual(items.map((item) => item.display), ["OREB"]);
  assert.equal(items.some((item) => item.key === "turnovers"), false);
});

test("punt candidates come only from recommended_strategy PUNT_CANDIDATE rows", () => {
  assert.deepEqual(selectPuntCandidateCategories(null), []);
  assert.deepEqual(
    selectPuntCandidateCategories({
      categories: [
        { key: "oreb", label: "OREB", classification: "TARGET" },
        { key: "turnovers", label: "TO", classification: "PUNT_CANDIDATE" },
        { key: "fg_pct", label: "FG%", classification: "FLEX" },
      ],
    }).map((item) => item.display),
    ["TO"],
  );
});

test("recommended strategy groups preserve backend classifications and labels", () => {
  const groups = groupRecommendedStrategy({
    categories: [
      { key: "assists", label: "AST", classification: "PROTECT" },
      { key: "oreb", label: "OREB", classification: "TARGET" },
      { key: "fg_pct", label: "FG%", classification: "FLEX" },
      { key: "turnovers", label: "TO", classification: "PUNT_CANDIDATE" },
      { key: "ignored", label: "X", classification: "MANAGER_DECLARED" },
    ],
  });
  assert.deepEqual(
    groups.map((group) => [group.id, strategyGroupLabel(group.id), group.categories.map((row) => row.label)]),
    [
      ["PROTECT", "PROTECT", ["AST"]],
      ["TARGET", "TARGET", ["OREB"]],
      ["FLEX", "FLEX", ["FG%"]],
      ["PUNT_CANDIDATE", "PUNT CANDIDATE", ["TO"]],
    ],
  );
});

test("strategy grouping ignores unknown classifications and empty payloads", () => {
  assert.deepEqual(groupRecommendedStrategy(null), []);
  assert.deepEqual(groupRecommendedStrategy({ categories: [] }), []);
});
