import Link from "next/link";
import type { FantasyPlayerPerformance } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  points: "PTS", three_pm: "3PTM", rebounds: "REB", oreb: "OREB",
  dreb: "DREB", assists: "AST", steals: "STL", blocks: "BLK",
};

function priority(player: FantasyPlayerPerformance): number {
  const watch = player.roster_watch;
  if (!watch) return 0;
  if (watch.role.state === "watch") return 4;
  if (watch.role.state === "limited_observed") return 3;
  if (watch.production.state === "review") return 2;
  if (watch.role.state === "early_watch") return 1;
  return 0;
}

function roleDescription(player: FantasyPlayerPerformance): string {
  const role = player.roster_watch!.role;
  if (role.state === "limited_observed") {
    return `${role.minutes?.toFixed(1)} MIN in ${role.sample_games} games · no reliable ${player.roster_watch!.previous_season} baseline`;
  }
  return `${role.minutes?.toFixed(1)} MIN / ${role.sample_games} GP · ${role.previous_minutes?.toFixed(1)} MIN / ${role.previous_games} GP in ${player.roster_watch!.previous_season}`;
}

export default function RosterWatchPanel({
  league, players, hasTargets,
}: {
  league: "ldl" | "bdb" | "gnfc";
  players: FantasyPlayerPerformance[];
  hasTargets: boolean;
}) {
  const evaluated = players.filter((player) => player.roster_watch?.basis === "completed_game_logs");
  if (!evaluated.length) return null;
  const flagged = evaluated.filter((player) => priority(player) > 0)
    .sort((a, b) => priority(b) - priority(a) || a.name.localeCompare(b.name));

  return (
    <section id="roster-watch" aria-labelledby="roster-watch-title" className="mt-8 scroll-mt-32 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">Roster watch · early evidence</p>
          <h2 id="roster-watch-title" className="mt-1 text-lg font-black text-slate-950 dark:text-white">Players to review</h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-600 dark:text-slate-400">
            Observed NBA minutes and category production, not drop recommendations. Fantasy Active/Reserve status does not measure NBA role.
          </p>
        </div>
        {hasTargets && (
          <a href="#player-targets" className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40">
            Explore free agents →
          </a>
        )}
      </div>

      {flagged.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {flagged.map((player) => {
            const watch = player.roster_watch!;
            const roleFlag = ["watch", "early_watch", "limited_observed"].includes(watch.role.state);
            const title = watch.role.state === "watch" ? "Lower minutes"
              : watch.role.state === "early_watch" ? "Possible minutes drop"
              : watch.role.state === "limited_observed" ? "Limited observed role"
              : "Category production to review";
            return (
              <article key={player.nba_id ?? player.name} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{player.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{watch.season_games} recorded games · through {watch.latest_game_date ?? "—"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${watch.role.state === "watch" ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"}`}>{title}</span>
                </div>
                {roleFlag && <p className="mt-2 text-xs tabular-nums text-slate-700 dark:text-slate-300">{roleDescription(player)}</p>}
                {watch.production.state === "review" && (
                  <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">Lower {watch.production.declines.map((item) => CATEGORY_LABELS[item.category] ?? item.category).join(" · ")} across {watch.production.sample_games} games</p>
                )}
                {player.injury && <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">Availability: {player.injury.detail || player.injury.status}</p>}
                {player.player_id && <Link href={`/players/${player.player_id}?league=${league}&from=roster`} className="mt-3 inline-block text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">Player details →</Link>}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No sustained role or multi-category production signal yet. The early-season sample may still be too small.</p>
      )}
      <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
        Minutes: latest five recorded games; 3+ for a watch signal, 2 are preliminary. Production: 5 games and declines in at least two league categories. Injuries are separate evidence; no automatic replacement decision.
      </p>
    </section>
  );
}
