export type OwnedPlayer = {
  league: "ldl" | "bdb";
  leagueName: string;
  name: string;
  injured: boolean;
};

type RosterPlayerLike = {
  short_name?: string | null;
  name: string;
  nba_team: string;
  nba_team_short: string;
  status: string;
  injury: unknown;
};

type PersonalTeamLike = {
  league: "ldl" | "bdb";
  leagueName: string;
  performance: { players: RosterPlayerLike[] } | null;
};

const ABBREVIATIONS: Record<string, string> = {
  ATL: "ATL", BOS: "BOS", BKN: "BKN", BRK: "BKN", CHA: "CHA", CHO: "CHA", CHI: "CHI",
  CLE: "CLE", DAL: "DAL", DEN: "DEN", DET: "DET", GS: "GSW", GSW: "GSW", HOU: "HOU",
  IND: "IND", LAC: "LAC", LAL: "LAL", MEM: "MEM", MIA: "MIA", MIL: "MIL", MIN: "MIN",
  NO: "NOP", NOP: "NOP", NY: "NYK", NYK: "NYK", OKC: "OKC", ORL: "ORL", PHI: "PHI",
  PHX: "PHX", PHO: "PHX", POR: "POR", SAC: "SAC", SA: "SAS", SAS: "SAS", TOR: "TOR",
  UTA: "UTA", UTAH: "UTA", WAS: "WAS", WSH: "WAS",
};

const FULL_NAMES: Record<string, string> = {
  atlantahawks: "ATL", bostonceltics: "BOS", brooklynnets: "BKN", charlottehornets: "CHA",
  chicagobulls: "CHI", clevelandcavaliers: "CLE", dallasmavericks: "DAL", denvernuggets: "DEN",
  detroitpistons: "DET", goldenstatewarriors: "GSW", houstonrockets: "HOU", indianapacers: "IND",
  losangelesclippers: "LAC", laclippers: "LAC", losangeleslakers: "LAL", memphisgrizzlies: "MEM",
  miamiheat: "MIA", milwaukeebucks: "MIL", minnesotatimberwolves: "MIN",
  neworleanspelicans: "NOP", newyorkknicks: "NYK", oklahomacitythunder: "OKC",
  orlandomagic: "ORL", philadelphia76ers: "PHI", phoenixsuns: "PHX",
  portlandtrailblazers: "POR", sacramentokings: "SAC", sanantoniospurs: "SAS",
  torontoraptors: "TOR", utahjazz: "UTA", washingtonwizards: "WAS",
};

export function canonicalTeamKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const abbreviation = ABBREVIATIONS[value.trim().toUpperCase()];
  if (abbreviation) return abbreviation;
  return FULL_NAMES[value.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;
}

export function ownedPlayersByTeam(teams: PersonalTeamLike[]): Map<string, OwnedPlayer[]> {
  const byTeam = new Map<string, OwnedPlayer[]>();
  for (const team of teams) {
    for (const player of team.performance?.players ?? []) {
      if (player.status === "IR") continue;
      const key = canonicalTeamKey(player.nba_team_short) ?? canonicalTeamKey(player.nba_team);
      if (!key) continue;
      const owned = byTeam.get(key) ?? [];
      owned.push({
        league: team.league,
        leagueName: team.leagueName,
        name: player.short_name || player.name,
        injured: Boolean(player.injury),
      });
      byTeam.set(key, owned);
    }
  }
  return byTeam;
}

export function ownedPlayersForGame(
  byTeam: Map<string, OwnedPlayer[]>,
  game: { home: { short: string; name: string }; away: { short: string; name: string } },
): OwnedPlayer[] {
  const keys = new Set<string>();
  for (const side of [game.away, game.home]) {
    const key = canonicalTeamKey(side.short) ?? canonicalTeamKey(side.name);
    if (key) keys.add(key);
  }
  return [...keys].flatMap((key) => byTeam.get(key) ?? []);
}
