import type { FantasyPlayerStats } from "./api";

/** Present recent counting totals per recorded game without changing the API's totals. */
export function rosterPerGameStats(stats: FantasyPlayerStats): FantasyPlayerStats {
  if (stats.games <= 0) return stats;
  const games = stats.games;
  return {
    ...stats,
    minutes: stats.minutes == null ? stats.minutes : stats.minutes / games,
    points: stats.points / games,
    rebounds: stats.rebounds == null ? stats.rebounds : stats.rebounds / games,
    three_pm: stats.three_pm / games,
    oreb: stats.oreb / games,
    dreb: stats.dreb / games,
    assists: stats.assists / games,
    steals: stats.steals / games,
    blocks: stats.blocks / games,
    turnovers: stats.turnovers / games,
    fgm: stats.fgm == null ? stats.fgm : stats.fgm / games,
    fga: stats.fga == null ? stats.fga : stats.fga / games,
    ftm: stats.ftm == null ? stats.ftm : stats.ftm / games,
    fta: stats.fta == null ? stats.fta : stats.fta / games,
  };
}
