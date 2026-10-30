import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const fit = readFileSync(
  new URL("../components/discovery/DiscoveryFitView.tsx", import.meta.url),
  "utf8",
);
const api = readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8");

test("Fit placeholder is gone and mounts real DiscoveryFitView", () => {
  assert.match(fit, /data-testid="discovery-fit"/);
  assert.match(fit, /System Recommended Strategy/);
  assert.doesNotMatch(fit, /being consolidated/);
  assert.doesNotMatch(fit, /DiscoveryViewPlaceholder/);
});

test("Fit uses TARGET as primary and Protect/Flex/Punt as secondary", () => {
  assert.match(fit, /fit-strategy-targets/);
  assert.match(fit, /Show Protect \/ Flex \/ Punt/);
  assert.match(fit, /PUNT_CANDIDATE/);
});

test("Fit supports automatic plan and explicit category exploration including PUNT", () => {
  assert.match(fit, /Automatic plan \/ Recommended targets/);
  assert.match(fit, /Explore a specific category/);
  assert.match(fit, /Punt candidate in your recommended strategy/);
  assert.match(fit, /Back to Automatic plan/);
  assert.match(fit, /strategy unchanged/);
});

test("Fit candidate presentation prefers helps/trade-offs/actionability over Fit Score", () => {
  assert.match(fit, /Helps/);
  assert.match(fit, /Trade-offs/);
  assert.match(fit, /Need-weighted z/);
  assert.doesNotMatch(fit, /Fit Score/);
  assert.doesNotMatch(fit, /87% fit|0–100|0-100/);
});

test("Fit reuses shared watchlist client and personal-team session resolution", () => {
  assert.match(fit, /upsertWatchlistEntry/);
  assert.match(fit, /\/api\/fantasy\/session/);
  assert.match(fit, /fantrax_team_id/);
  assert.match(fit, /fit-no-team/);
  assert.match(fit, /fit-team-mismatch/);
});

test("GNFC Fit omits cap controls and LDL/BDB keep cap scope", () => {
  assert.match(fit, /fit-cap-scope/);
  assert.match(fit, /league !== "gnfc"/);
  assert.match(fit, /MinutesTrendEvidence/);
});

test("API types include additive strategy_summary", () => {
  assert.match(api, /export interface FantasyStrategySummary/);
  assert.match(api, /strategy_summary\?: FantasyStrategySummary/);
  assert.match(api, /classification: "TARGET" \| "PROTECT" \| "FLEX" \| "PUNT_CANDIDATE"/);
});

test("Fit uses true backend offset pagination, not a client-only first-page slice", () => {
  assert.match(fit, /offset: String\(offset\)/);
  assert.match(fit, /visibleCandidates\.length/);
  assert.match(fit, /appendUniqueCandidates/);
  assert.match(fit, /loadMoreCandidates/);
  assert.match(fit, /filtered_candidates/);
  assert.doesNotMatch(fit, /candidates\.slice\(0,\s*visible\)/);
  assert.doesNotMatch(fit, /setVisible\(\(n\)\s*=>\s*n\s*\+\s*PAGE_SIZE\)/);
});

test("desktop Fit cards tighten vertical spacing without dropping explainability fields", () => {
  assert.match(fit, /sm:py-2/);
  assert.match(fit, /sm:space-y-1\.5/);
  assert.match(fit, /Helps/);
  assert.match(fit, /Trade-offs/);
  assert.match(fit, /Evidence details/);
  assert.match(fit, /fit-watch/);
  assert.doesNotMatch(fit, /sm:flex-col sm:items-stretch/);
});
