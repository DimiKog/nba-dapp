import assert from "node:assert/strict";
import { test } from "node:test";
import { candidateListCopy, PLAYER_POSITION_OPTIONS } from "../lib/categoryTargetDiscovery.ts";

test("position choices do not depend on the first page of candidates", () => {
  assert.deepEqual(PLAYER_POSITION_OPTIONS, ["PG", "SG", "G", "SF", "PF", "F", "C"]);
});

test("truncated candidates are not presented as the complete list", () => {
  const copy = candidateListCopy(24, 310);
  assert.equal(copy.title, "Explore 24 of 310 matching candidates");
  assert.match(copy.description, /Only 24 candidates are loaded/);
});

test("complete and empty results receive accurate labels", () => {
  assert.equal(candidateListCopy(12, 12).title, "Explore all 12 matching candidates");
  assert.equal(candidateListCopy(0, 0).title, "Explore candidates (0 matches)");
});
