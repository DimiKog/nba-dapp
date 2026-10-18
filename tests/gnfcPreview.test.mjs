import assert from "node:assert/strict";
import { test } from "node:test";
import { gnfcPreviewStatus } from "../lib/gnfcPreview.ts";

test("partial league does not present free agents as available", () => {
  const status = gnfcPreviewStatus(9, 12, false);
  assert.equal(status.remainingTeams, 3);
  assert.match(status.title, /3 more teams/);
  assert.match(status.description, /Free-agent proposals stay closed/);
});

test("twelve teams alone do not turn on free-agent proposals", () => {
  const status = gnfcPreviewStatus(12, 12, false);
  assert.equal(status.remainingTeams, 0);
  assert.match(status.title, /await verification/);
  assert.match(status.description, /Rosters can be viewed now/);
});

test("an activated backend presents free-agent proposals as enabled", () => {
  const status = gnfcPreviewStatus(12, 12, true);
  assert.match(status.title, /enabled/);
});
