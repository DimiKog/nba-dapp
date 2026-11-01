import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANALYSIS_BODY_FIELDS,
  backendIdentityForwardHeaders,
  backendRosterMoveUrl,
  browserSafeResponseHeaders,
  DISCOVERY_BODY_FIELDS,
  identitySecretsLeakInBody,
  unknownBodyFields,
  validRosterMoveTeamId,
} from "../lib/rosterMoveBff.ts";

test("team id validation matches existing BFF conventions", () => {
  assert.equal(validRosterMoveTeamId("ldl-team-a"), true);
  assert.equal(validRosterMoveTeamId("team_1"), true);
  assert.equal(validRosterMoveTeamId("../evil"), false);
  assert.equal(validRosterMoveTeamId(""), false);
});

test("discovery and analysis body field allowlists reject unknowns", () => {
  assert.deepEqual(
    unknownBodyFields({ basis: "season", hack: true }, [...DISCOVERY_BODY_FIELDS]),
    ["hack"],
  );
  assert.deepEqual(
    unknownBodyFields(
      { remove_nba_id: 1, add_nba_id: 2, unexpected: true },
      [...ANALYSIS_BODY_FIELDS],
    ),
    ["unexpected"],
  );
  assert.deepEqual(
    unknownBodyFields({ basis: "season" }, [...DISCOVERY_BODY_FIELDS]),
    [],
  );
});

test("backend proxy URL uses personal team id path segment", () => {
  assert.equal(
    backendRosterMoveUrl("https://api.example", "ldl", "team-a", "roster-move-discovery"),
    "https://api.example/api/fantasy/ldl/roster/team-a/roster-move-discovery",
  );
  assert.equal(
    backendRosterMoveUrl("https://api.example", "bdb", "t 1", "roster-move-analysis"),
    "https://api.example/api/fantasy/bdb/roster/t%201/roster-move-analysis",
  );
  assert.equal(
    backendRosterMoveUrl("https://api.example", "gnfc", "gnfc-athens", "roster-move-discovery"),
    "https://api.example/api/fantasy/gnfc/roster/gnfc-athens/roster-move-discovery",
  );
});


test("identity headers are forwarded server-side and not mirrored as browser body secrets", () => {
  const identity = new Headers({
    "X-Fantasy-Identity-Key": "secret-key",
    "X-Fantasy-Identity-Email": "manager@example.com",
  });
  const forwarded = backendIdentityForwardHeaders(identity);
  assert.equal(forwarded["x-fantasy-identity-key"] ?? forwarded["X-Fantasy-Identity-Key"], "secret-key");
  assert.equal(forwarded["Content-Type"], "application/json");

  const browserHeaders = browserSafeResponseHeaders();
  assert.equal(browserHeaders["Content-Type"], "application/json");
  assert.equal(
    Object.keys(browserHeaders).some((key) => key.toLowerCase().includes("identity")),
    false,
  );
  assert.equal(identitySecretsLeakInBody({ moves: [] }), false);
  assert.equal(
    identitySecretsLeakInBody({ note: "X-Fantasy-Identity-Key=leak" }),
    true,
  );
});
