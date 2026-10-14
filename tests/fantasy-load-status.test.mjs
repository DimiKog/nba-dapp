import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiResponseError,
  fetchFantasyRoster,
  fetchFantasyRosterPerformance,
} from "../lib/api.ts";

test("roster fetch preserves a missing team's HTTP status", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  try {
    await assert.rejects(
      fetchFantasyRoster("ldl", "missing-team"),
      (error) => error instanceof ApiResponseError && error.status === 404,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("roster performance fetch preserves a temporary failure status", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  try {
    await assert.rejects(
      fetchFantasyRosterPerformance("ldl", "team-a"),
      (error) => error instanceof ApiResponseError && error.status === 503,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});
