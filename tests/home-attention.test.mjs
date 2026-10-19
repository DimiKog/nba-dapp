import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHomeAttentionItems, formatInjuryDetail } from "../lib/homeAttention.ts";

test("GNFC injuries appear in the same Home alerts without cap assumptions", () => {
  const items = buildHomeAttentionItems([
    {
      league: "gnfc",
      teamId: "team-1",
      teamName: "Athens BrickLayers",
      rosterCount: 14,
      rosterMinimum: null,
      capRemaining: null,
      injuredPlayerNames: ["J. Holiday"],
    },
  ]);

  assert.deepEqual(items, [{
    key: "gnfc-injuries",
    kind: "injury",
    league: "gnfc",
    injuryCount: 1,
    title: "1 injury alert on Athens BrickLayers",
    detail: "J. Holiday",
    href: "/fantasy/gnfc/roster/team-1",
    tone: "warning",
  }]);
});

test("shared Home alerts keep roster and cap checks ahead of injuries", () => {
  const items = buildHomeAttentionItems([
    {
      league: "ldl",
      teamId: "team-2",
      teamName: "Piraeus Newbies",
      rosterCount: 12,
      rosterMinimum: 13,
      capRemaining: -5_700_000,
      injuredPlayerNames: ["B. Adebayo"],
    },
  ]);

  assert.deepEqual(items.map((item) => item.key), ["ldl-roster", "ldl-cap", "ldl-injuries"]);
  assert.deepEqual(items.map((item) => item.kind), ["roster", "cap", "injury"]);
  assert.match(items[1].title, /\$5\.7M over the cap/);
});

test("injury detail keeps three names and appends a remainder count", () => {
  assert.equal(formatInjuryDetail(["A. One", "B. Two", "C. Three"]), "A. One · B. Two · C. Three");
  assert.equal(
    formatInjuryDetail(["A. One", "B. Two", "C. Three", "D. Four", "E. Five"]),
    "A. One · B. Two · C. Three · +2",
  );

  const [item] = buildHomeAttentionItems([
    {
      league: "bdb",
      teamId: "team-3",
      teamName: "Cap City",
      rosterCount: 14,
      rosterMinimum: 13,
      capRemaining: 1,
      injuredPlayerNames: ["A. One", "B. Two", "C. Three", "D. Four"],
    },
  ]);

  assert.equal(item.kind, "injury");
  assert.equal(item.injuryCount, 4);
  assert.equal(item.detail, "A. One · B. Two · C. Three · +1");
});
