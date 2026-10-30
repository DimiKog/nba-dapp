import assert from "node:assert/strict";
import { test } from "node:test";
import {
  browseBasisLabel,
  formatBrowseCacheHint,
  formatBrowseMetadata,
} from "../lib/browsePresentation.ts";

test("Browse metadata uses real counts and basis without inventing Fit language", () => {
  const line = formatBrowseMetadata({
    visiblePlayers: 20,
    freeAgentsInView: 8,
    injuryAlertsInView: 1,
    basis: "season",
    windowDays: 7,
    season: "2026-27",
  });
  assert.equal(line, "20 players · 8 free agents · 1 injury · Season · 2026-27");
  assert.equal(line.toLowerCase().includes("fit"), false);
  assert.equal(line.toLowerCase().includes("target"), false);
  assert.equal(browseBasisLabel("window", 14), "Last 14d");
});

test("Browse metadata omits injury segment when there are none", () => {
  assert.equal(
    formatBrowseMetadata({
      visiblePlayers: 1,
      freeAgentsInView: 1,
      injuryAlertsInView: 0,
      basis: "window",
      windowDays: 7,
      season: "2026-27",
    }),
    "1 player · 1 free agent · Last 7d · 2026-27",
  );
});

test("cache hint formats only when a valid timestamp exists", () => {
  assert.equal(formatBrowseCacheHint(null), null);
  assert.equal(formatBrowseCacheHint("not-a-date"), null);
  assert.match(formatBrowseCacheHint("2026-10-30T12:00:00Z") ?? "", /Cached/);
});
