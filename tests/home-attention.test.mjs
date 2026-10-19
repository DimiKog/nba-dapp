import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHomeAttentionItems } from "../lib/homeAttention.ts";

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
  assert.match(items[1].title, /\$5\.7M over the cap/);
});
