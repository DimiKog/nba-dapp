import Image from "next/image";
import Link from "next/link";
import { photoUrl, type NbaHotFive } from "@/lib/api";

const formatDay = (day: string) => new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", timeZone: "UTC",
}).format(new Date(`${day}T12:00:00Z`));

export default function HomeHotFive({ data }: { data: NbaHotFive | null }) {
  const start = data?.window.start;
  const end = data?.window.end;
  const period = start && end ? `${formatDay(start)}–${formatDay(end)}` : "2026–27 regular season";
  const hasPlayers = Boolean(data?.players.length);
  const partial = data?.status === "partial_coverage";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80" aria-labelledby="hot-five-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">NBA form · pilot</p>
          <h2 id="hot-five-heading" className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">Hot 5</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{period} · One NBA-wide list, not a pickup recommendation</p>
        </div>
        {data?.coverage.games ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${partial ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"}`}>
            {partial ? "Partial player coverage" : "Recorded boxscores"}
          </span>
        ) : null}
      </div>

      {!hasPlayers ? (
        <div className="px-4 py-7 text-sm text-slate-600 dark:text-slate-300 sm:px-5">
          {data === null
            ? "Hot 5 is temporarily unavailable. The rest of Home is unaffected."
            : data.status === "awaiting_games"
              ? "Waiting for 2026–27 regular-season games. Preseason results are not included."
              : data.status === "awaiting_boxscores"
                ? "No audited regular-season boxscores are available yet. The boxscore sync needs checking."
              : data.status === "stale"
                ? "No recent audited boxscores. The list will return when new games are recorded."
                : "Not enough players have completed the minimum game and minutes sample yet."}
        </div>
      ) : (
        <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-5">
          {data!.players.map((player, index) => {
            const image = photoUrl(player.photo, player.nba_id);
            return (
              <Link key={player.nba_id} href={`/players/${player.player_id}?from=home-hot-five`} className="group rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-blue-500 dark:hover:bg-slate-800">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-extrabold text-white">{index + 1}</span>
                  {image ? <Image src={image} alt="" width={38} height={38} className="h-10 w-10 rounded-full bg-slate-200 object-cover dark:bg-slate-700" /> : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{player.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{player.team ?? "NBA"} · {player.games} GP</p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{player.stats.points.toFixed(1)} PTS <span className="text-slate-400">·</span> {player.stats.rebounds.toFixed(1)} REB</p>
                <p className="mt-1 text-xs tabular-nums text-slate-600 dark:text-slate-300">{player.stats.assists.toFixed(1)} AST · {player.minutes.toFixed(1)} MIN</p>
                <p className="mt-3 truncate text-[11px] font-semibold text-blue-700 dark:text-blue-300">{player.drivers.map((driver) => driver.category === "three_pm" ? "3PTM" : driver.category === "fg_pct" ? "FG%" : driver.category === "ft_pct" ? "FT%" : driver.category.toUpperCase()).join(" · ") || "Balanced production"} →</p>
              </Link>
            );
          })}
        </div>
      )}

      <details className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:px-5">
        <summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">How is Hot 5 ranked?</summary>
        <p className="mt-2 leading-relaxed">Last seven recorded NBA dates, regular season only. Nine standard categories are compared per game; turnovers count negatively and shooting percentages account for attempts. Players need at least {data?.criteria.minimum_games ?? 2} games and {data?.criteria.minimum_minutes_per_game ?? 15} minutes per game. A two-game sample receives a reliability discount. Current role, fantasy availability and your team needs do not affect this list.</p>
        <p className="mt-1 leading-relaxed">{data?.coverage.games ?? 0} recorded games · {data?.coverage.mapped_players ?? 0}/{data?.coverage.source_players ?? 0} played player rows mapped. {partial ? "Some players are missing; rankings may change after identity review." : "This does not independently verify that every scheduled game was captured."}</p>
      </details>
    </section>
  );
}
