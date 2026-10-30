import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DISCOVERY_LEAGUE_SLUGS,
  discoveryLeagueLabel,
  isDiscoveryLeagueSlug,
  isExplorerLeagueSlug,
  parseDiscoveryLeagueSlug,
  resolveDiscoveryLeague,
} from "../lib/discoveryLeagues.ts";
import {
  DISCOVERY_VIEWS,
  DISCOVERY_VIEW_LABELS,
  buildDiscoveryHref,
  buildWatchlistRedirectHref,
  isDiscoveryView,
  parseDiscoveryView,
} from "../lib/discoveryViews.ts";
import { parseLeagueSlug } from "../lib/leagues.ts";

test("Discovery views include the four workspace tabs with Browse as default", () => {
  assert.deepEqual(DISCOVERY_VIEWS, ["browse", "fit", "watched", "fa-trends"]);
  assert.equal(parseDiscoveryView(null), "browse");
  assert.equal(parseDiscoveryView(undefined), "browse");
  assert.equal(parseDiscoveryView(""), "browse");
  assert.equal(parseDiscoveryView("nope"), "browse");
  assert.equal(parseDiscoveryView("browse"), "browse");
  assert.equal(parseDiscoveryView("fit"), "fit");
  assert.equal(parseDiscoveryView("watched"), "watched");
  assert.equal(parseDiscoveryView("fa-trends"), "fa-trends");
  assert.equal(isDiscoveryView("fit"), true);
  assert.equal(isDiscoveryView("radar"), false);
  assert.equal(DISCOVERY_VIEW_LABELS.fit, "Fit to my plan");
});

test("Discovery leagues treat LDL, BDB and GNFC as distinct and never remap GNFC to LDL", () => {
  assert.deepEqual(DISCOVERY_LEAGUE_SLUGS, ["ldl", "bdb", "gnfc"]);
  assert.equal(isDiscoveryLeagueSlug("gnfc"), true);
  assert.equal(parseDiscoveryLeagueSlug("gnfc"), "gnfc");
  assert.equal(parseDiscoveryLeagueSlug("ldl"), "ldl");
  assert.equal(parseDiscoveryLeagueSlug("bdb"), "bdb");
  assert.equal(parseDiscoveryLeagueSlug("third"), null);
  assert.equal(parseDiscoveryLeagueSlug(null), null);

  assert.equal(resolveDiscoveryLeague("gnfc", "ldl"), "gnfc");
  assert.equal(resolveDiscoveryLeague("gnfc", "bdb"), "gnfc");
  assert.equal(resolveDiscoveryLeague(null, "bdb"), "bdb");
  assert.equal(resolveDiscoveryLeague("unknown", "ldl"), "ldl");

  // Legacy helper still collapses unknown → LDL, but Discovery must not use it for gnfc.
  assert.equal(parseLeagueSlug("gnfc"), "ldl");
  assert.notEqual(resolveDiscoveryLeague("gnfc", "ldl"), parseLeagueSlug("gnfc"));

  assert.equal(discoveryLeagueLabel("gnfc"), "GNFC");
  assert.equal(isExplorerLeagueSlug("ldl"), true);
  assert.equal(isExplorerLeagueSlug("bdb"), true);
  assert.equal(isExplorerLeagueSlug("gnfc"), false);
});

test("canonical Discovery hrefs encode view and league without inventing analytics", () => {
  assert.equal(buildDiscoveryHref(), "/players");
  assert.equal(buildDiscoveryHref({ view: "browse" }), "/players");
  assert.equal(buildDiscoveryHref({ view: "browse", league: "ldl" }), "/players?league=ldl");
  assert.equal(
    buildDiscoveryHref({ view: "fit", league: "bdb" }),
    "/players?view=fit&league=bdb",
  );
  assert.equal(
    buildDiscoveryHref({ view: "watched", league: "gnfc" }),
    "/players?view=watched&league=gnfc",
  );
  assert.equal(
    buildDiscoveryHref({ view: "fa-trends", league: "ldl", team: "team-1" }),
    "/players?view=fa-trends&league=ldl&team=team-1",
  );
  assert.equal(
    buildDiscoveryHref({ view: "invalid", league: "gnfc" }),
    "/players?league=gnfc",
  );
});

test("watchlist compatibility redirects preserve league including GNFC", () => {
  assert.equal(buildWatchlistRedirectHref("ldl"), "/players?view=watched&league=ldl");
  assert.equal(buildWatchlistRedirectHref("bdb"), "/players?view=watched&league=bdb");
  assert.equal(buildWatchlistRedirectHref("gnfc"), "/players?view=watched&league=gnfc");
  assert.equal(buildWatchlistRedirectHref(undefined), "/players?view=watched");
  assert.equal(buildWatchlistRedirectHref(""), "/players?view=watched");
});
