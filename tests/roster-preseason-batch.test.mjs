import assert from "node:assert/strict";
import test from "node:test";
import { fetchRosterPreseasonAverages } from "../lib/api.ts";

test("preseason roster fetch includes every player beyond one 20-player batch", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    const ids = new URL(url).searchParams.get("nba_ids").split(",");
    calls.push(ids);
    return {
      ok: true,
      json: async () => ({
        season: "2026-27",
        players: Object.fromEntries(ids.map((id) => [id, { games: 1 }])),
      }),
    };
  };
  try {
    const result = await fetchRosterPreseasonAverages(Array.from({ length: 22 }, (_, index) => index + 1));
    assert.deepEqual(calls.map((batch) => batch.length), [20, 2]);
    assert.equal(Object.keys(result.players).length, 22);
    assert.equal(result.players["22"].games, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
