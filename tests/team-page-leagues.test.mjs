import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  TEAM_PAGE_LEAGUE_SLUGS,
  isRosterMoveLeagueSlug,
  isTeamPageLeagueSlug,
  teamPageCapabilities,
} from "../lib/teamPageLeagues.ts";

test("team page leagues include GNFC without remapping to LDL/BDB", () => {
  assert.deepEqual(TEAM_PAGE_LEAGUE_SLUGS, ["ldl", "bdb", "gnfc"]);
  assert.equal(isTeamPageLeagueSlug("gnfc"), true);
  assert.equal(isTeamPageLeagueSlug("ldl"), true);
  assert.equal(isTeamPageLeagueSlug("third"), false);
  assert.equal(isRosterMoveLeagueSlug("gnfc"), true);
  assert.equal(isRosterMoveLeagueSlug("ldl"), true);
  assert.equal(isRosterMoveLeagueSlug("third"), false);
});

test("GNFC team capabilities stay uncapped with no payroll or fantasy salary presentation", () => {
  const gnfc = teamPageCapabilities("gnfc");
  assert.equal(gnfc.showCap, false);
  assert.equal(gnfc.showPayroll, false);
  assert.equal(gnfc.showTradeAnalyze, false);
  assert.equal(gnfc.showCategoryStrategyLink, false);
  assert.equal(gnfc.showSalaryInFallbackRoster, false);
  assert.equal(gnfc.usesAvailabilityGate, true);
  assert.equal(gnfc.brandEyebrow, "GNFC Γ5 · roster");
  assert.equal(gnfc.standingsHref, "/fantasy/gnfc");
  assert.match(gnfc.standingsLabel, /GNFC/);

  const ldl = teamPageCapabilities("ldl");
  assert.equal(ldl.showCap, true);
  assert.equal(ldl.showPayroll, true);
  assert.equal(ldl.showTradeAnalyze, true);
  assert.equal(ldl.usesAvailabilityGate, false);

  const bdb = teamPageCapabilities("bdb");
  assert.equal(bdb.showCap, true);
  assert.equal(bdb.showPayroll, true);
  assert.equal(bdb.usesAvailabilityGate, false);
});

test("GNFC personal Team page reuses FantasyRosterPage and TeamIntelligenceArea", () => {
  const page = readFileSync(
    new URL("../app/fantasy/gnfc/roster/[teamId]/page.tsx", import.meta.url),
    "utf8",
  );
  const shell = readFileSync(
    new URL("../components/FantasyRosterPage.tsx", import.meta.url),
    "utf8",
  );
  const intelligence = readFileSync(
    new URL("../components/TeamIntelligenceArea.tsx", import.meta.url),
    "utf8",
  );
  const discoveryRoute = readFileSync(
    new URL("../app/api/fantasy/[league]/roster/[teamId]/roster-move-discovery/route.ts", import.meta.url),
    "utf8",
  );
  const analysisRoute = readFileSync(
    new URL("../app/api/fantasy/[league]/roster/[teamId]/roster-move-analysis/route.ts", import.meta.url),
    "utf8",
  );
  const api = readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8");

  assert.match(page, /FantasyRosterPage/);
  assert.match(page, /league="gnfc"/);
  assert.match(page, /GnfcAvailabilityNotice/);
  assert.match(page, /CategoryNeedsSection/);
  assert.match(page, /GnfcPowerSummary/);
  assert.match(page, /RosterWatchPanel/);
  assert.match(page, /discoveryEnabled=\{availabilityReady\}/);
  assert.doesNotMatch(page, /league=\"ldl\"/);
  assert.doesNotMatch(page, /league=\"bdb\"/);

  assert.match(shell, /TeamIntelligenceArea/);
  assert.match(shell, /TeamDataArea/);
  assert.match(shell, /showCap=\{caps\.showCap\}/);
  assert.match(shell, /TeamPageLeagueSlug/);
  assert.match(shell, /discoveryEnabled/);

  assert.match(intelligence, /TeamPageLeagueSlug/);
  assert.match(intelligence, /discoveryEnabled/);
  assert.match(intelligence, /unavailable/);
  assert.match(intelligence, /fetchRosterMoveDiscovery/);
  assert.doesNotMatch(intelligence, /league === \"ldl\" \? \"bdb\"/);

  assert.match(discoveryRoute, /isRosterMoveLeagueSlug/);
  assert.doesNotMatch(discoveryRoute, /isLeagueSlug/);
  assert.match(analysisRoute, /isRosterMoveLeagueSlug/);
  assert.match(api, /fetchRosterMoveDiscovery\(\s*league: \"ldl\" \| \"bdb\" \| \"gnfc\"/);
  assert.match(api, /fetchRosterMoveAnalysis\(\s*league: \"ldl\" \| \"bdb\" \| \"gnfc\"/);
});

test("roster-move BFF URL helper preserves gnfc in the path", async () => {
  const { backendRosterMoveUrl } = await import("../lib/rosterMoveBff.ts");
  assert.equal(
    backendRosterMoveUrl("https://api.example", "gnfc", "gnfc-athens", "roster-move-discovery"),
    "https://api.example/api/fantasy/gnfc/roster/gnfc-athens/roster-move-discovery",
  );
  assert.equal(
    backendRosterMoveUrl("https://api.example", "gnfc", "gnfc-athens", "roster-move-analysis"),
    "https://api.example/api/fantasy/gnfc/roster/gnfc-athens/roster-move-analysis",
  );
});
