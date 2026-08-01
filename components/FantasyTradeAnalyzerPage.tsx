import Link from "next/link";
import { notFound } from "next/navigation";
import TradeAnalyzerWorkspace from "@/components/TradeAnalyzerWorkspace";
import {
  fetchFantasyRosterPerformance,
  fetchLeaguePlayerExplorer,
  type TradeBasis,
} from "@/lib/api";

type LeagueSlug = "ldl" | "bdb";

export interface TradeAnalyzerInitialState {
  mode: "suggestions" | "analyze" | "partners";
  outgoing: string;
  incoming: string;
  partner: string;
  basis: TradeBasis;
}

export default async function FantasyTradeAnalyzerPage({
  league,
  teamId,
  initialState,
}: {
  league: LeagueSlug;
  teamId: string;
  initialState: TradeAnalyzerInitialState;
}) {
  let performance;
  let explorer;
  try {
    [performance, explorer] = await Promise.all([
      fetchFantasyRosterPerformance(league, teamId, 14),
      fetchLeaguePlayerExplorer(league, 14),
    ]);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8">
      <Link
        href={`/fantasy/${league}/roster/${encodeURIComponent(teamId)}`}
        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to {performance.team.name}
      </Link>
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          Trade intelligence
        </p>
        <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Trade Analyzer</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Discover balanced returns, test an exact one-for-one move, or find which teams need your player most.
        </p>
      </div>
      <TradeAnalyzerWorkspace
        league={league}
        teamId={teamId}
        teamName={performance.team.name}
        personalTeamId={performance.league.personal_team_id}
        ownPlayers={performance.players}
        leaguePlayers={explorer.players}
        initialState={initialState}
      />
    </main>
  );
}
