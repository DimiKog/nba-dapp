import assert from "node:assert/strict";
import test from "node:test";
import { gnfcFaMarketSummary } from "../lib/gnfcFaMarketSummary.ts";

test("weak market is not presented as hundreds of recommended pickups", () => {
  const result = gnfcFaMarketSummary({
    sample: { filtered_candidates: 174 },
    category_recommendations: [{ label: "PTS", free_agent_market: "weak" }],
  });
  assert.equal(result, "PTS: weak FA market");
  assert.ok(!result.includes("174"));
});

test("each selected need keeps its own FA market verdict", () => {
  const result = gnfcFaMarketSummary({
    category_recommendations: [
      { label: "PTS", free_agent_market: "limited" },
      { label: "STL", free_agent_market: "strong" },
    ],
  });
  assert.equal(result, "PTS: limited statistical help · STL: meaningful statistical help");
});
