import test from "node:test";
import assert from "node:assert/strict";
import { isAvailabilityLeagueSlug } from "../lib/availabilityLeagues.ts";

test("FA discovery accepts GNFC without adding it to LDL/BδB navigation", () => {
  assert.equal(isAvailabilityLeagueSlug("ldl"), true);
  assert.equal(isAvailabilityLeagueSlug("bdb"), true);
  assert.equal(isAvailabilityLeagueSlug("gnfc"), true);
  assert.equal(isAvailabilityLeagueSlug("unknown"), false);
});
