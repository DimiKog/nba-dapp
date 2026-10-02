import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalTeamKey,
  ownedPlayersByTeam,
  ownedPlayersForGame,
} from "../lib/scoreboardOwnership.ts";

// Real ESPN scoreboard abbreviations (as stored in nba_games) paired with the
// full team names the backend's contract tables use.
const TEAMS = [
  ["ATL", "Atlanta Hawks"], ["BOS", "Boston Celtics"], ["BKN", "Brooklyn Nets"],
  ["CHA", "Charlotte Hornets"], ["CHI", "Chicago Bulls"], ["CLE", "Cleveland Cavaliers"],
  ["DAL", "Dallas Mavericks"], ["DEN", "Denver Nuggets"], ["DET", "Detroit Pistons"],
  ["GS", "Golden State Warriors"], ["HOU", "Houston Rockets"], ["IND", "Indiana Pacers"],
  ["LAC", "Los Angeles Clippers"], ["LAL", "Los Angeles Lakers"], ["MEM", "Memphis Grizzlies"],
  ["MIA", "Miami Heat"], ["MIL", "Milwaukee Bucks"], ["MIN", "Minnesota Timberwolves"],
  ["NO", "New Orleans Pelicans"], ["NY", "New York Knicks"], ["OKC", "Oklahoma City Thunder"],
  ["ORL", "Orlando Magic"], ["PHI", "Philadelphia 76ers"], ["PHX", "Phoenix Suns"],
  ["POR", "Portland Trailblazers"], ["SAC", "Sacramento Kings"], ["SA", "San Antonio Spurs"],
  ["TOR", "Toronto Raptors"], ["UTAH", "Utah Jazz"], ["WSH", "Washington Wizards"],
];

test("all 30 ESPN abbreviations resolve to 30 distinct teams", () => {
  const keys = TEAMS.map(([abbreviation]) => canonicalTeamKey(abbreviation));
  assert.ok(keys.every(Boolean));
  assert.equal(new Set(keys).size, 30);
});

test("every full team name resolves to the same team as its ESPN abbreviation", () => {
  for (const [abbreviation, fullName] of TEAMS) {
    assert.equal(canonicalTeamKey(fullName), canonicalTeamKey(abbreviation), fullName);
  }
});

test("alternate abbreviation vocabularies match the ESPN ones", () => {
  const pairs = [["GSW", "GS"], ["NOP", "NO"], ["NYK", "NY"], ["SAS", "SA"], ["UTA", "UTAH"], ["WAS", "WSH"], ["BRK", "BKN"], ["PHO", "PHX"], ["CHO", "CHA"]];
  for (const [alternate, espn] of pairs) {
    assert.equal(canonicalTeamKey(alternate), canonicalTeamKey(espn), alternate);
  }
  assert.equal(canonicalTeamKey("Portland Trail Blazers"), canonicalTeamKey("POR"));
  assert.equal(canonicalTeamKey(" lal "), canonicalTeamKey("LAL"));
});

test("unknown, free-agent and empty team values never match", () => {
  for (const value of ["FA", "(N/A)", "", "  ", null, undefined, "XYZ"]) {
    assert.equal(canonicalTeamKey(value), null, String(value));
  }
});

const player = (overrides) => ({
  name: "Player",
  short_name: "Player",
  nba_team: "",
  nba_team_short: "",
  status: "Active",
  injury: null,
  ...overrides,
});

test("owned players are grouped by NBA team across both leagues", () => {
  const byTeam = ownedPlayersByTeam([
    { league: "ldl", leagueName: "LDL", performance: { players: [player({ short_name: "Edwards", nba_team_short: "MIN" })] } },
    { league: "bdb", leagueName: "BδB", performance: { players: [player({ short_name: "Gobert", nba_team_short: "MIN" })] } },
  ]);
  assert.deepEqual(byTeam.get("MIN").map((p) => [p.name, p.leagueName]), [["Edwards", "LDL"], ["Gobert", "BδB"]]);
});

test("IR players are excluded and injured players are flagged", () => {
  const byTeam = ownedPlayersByTeam([{
    league: "ldl",
    leagueName: "LDL",
    performance: {
      players: [
        player({ short_name: "Healthy", nba_team_short: "LAL" }),
        player({ short_name: "Hurt", nba_team_short: "LAL", injury: "Ankle" }),
        player({ short_name: "OnIR", nba_team_short: "LAL", status: "IR", injury: "Knee" }),
      ],
    },
  }]);
  assert.deepEqual(byTeam.get("LAL").map((p) => [p.name, p.injured]), [["Healthy", false], ["Hurt", true]]);
});

test("falls back to the full NBA team name when the short code is unrecognised", () => {
  const byTeam = ownedPlayersByTeam([{
    league: "ldl",
    leagueName: "LDL",
    performance: { players: [player({ short_name: "Fallback", nba_team_short: "???", nba_team: "Denver Nuggets" })] },
  }]);
  assert.equal(byTeam.get("DEN")[0].name, "Fallback");
});

test("teams without a loaded roster and unmatched players are ignored", () => {
  const byTeam = ownedPlayersByTeam([
    { league: "ldl", leagueName: "LDL", performance: null },
    { league: "bdb", leagueName: "BδB", performance: { players: [player({ nba_team_short: "FA" })] } },
  ]);
  assert.equal(byTeam.size, 0);
});

const game = (awayShort, homeShort) => ({
  away: { short: awayShort, name: awayShort },
  home: { short: homeShort, name: homeShort },
});

test("a game matches players on either side, using ESPN abbreviations", () => {
  const byTeam = ownedPlayersByTeam([{
    league: "ldl",
    leagueName: "LDL",
    performance: {
      players: [
        player({ short_name: "Cade", nba_team_short: "DET" }),
        player({ short_name: "Wemby", nba_team_short: "SAS" }),
        player({ short_name: "Brunson", nba_team_short: "NYK" }),
      ],
    },
  }]);
  assert.deepEqual(ownedPlayersForGame(byTeam, game("SA", "DET")).map((p) => p.name).sort(), ["Cade", "Wemby"]);
  assert.deepEqual(ownedPlayersForGame(byTeam, game("NY", "BOS")).map((p) => p.name), ["Brunson"]);
  assert.deepEqual(ownedPlayersForGame(byTeam, game("BOS", "MIA")), []);
});

test("a game with unrecognised teams matches nothing", () => {
  const byTeam = ownedPlayersByTeam([{
    league: "ldl",
    leagueName: "LDL",
    performance: { players: [player({ nba_team_short: "LAL" })] },
  }]);
  assert.deepEqual(ownedPlayersForGame(byTeam, game("AAA", "BBB")), []);
});
