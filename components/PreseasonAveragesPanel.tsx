import type { PlayerPreseasonAverages } from "@/lib/api";

const STATS = [
  { key: "minutes", label: "MIN" },
  { key: "points", label: "PTS" },
  { key: "rebounds", label: "REB" },
  { key: "assists", label: "AST" },
  { key: "three_pm", label: "3PTM" },
  { key: "fg_pct", label: "FG%" },
  { key: "ft_pct", label: "FT%" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "turnovers", label: "TO" },
] as const;

export default function PreseasonAveragesPanel({ data }: { data: PlayerPreseasonAverages | null }) {
  const averages = data?.averages;
  return (
    <section className="mt-5 rounded-3xl border border-violet-200 bg-violet-50/60 p-5 dark:border-violet-900 dark:bg-violet-950/20 sm:p-6" aria-label="Preseason averages">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">NBA preseason · {data?.season ?? "current season"}</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Preseason averages</h2>
        </div>
        {data && data.games > 0 && (
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-200">
            {data.games} {data.games === 1 ? "game" : "games"}{data.games < 3 ? " · small sample" : ""}
          </span>
        )}
      </div>

      {averages && data.games > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STATS.map(({ key, label }) => (
            <div key={key} className="rounded-xl border border-violet-100 bg-white/80 px-3 py-2.5 dark:border-violet-900 dark:bg-slate-900/70">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-950 dark:text-white">
                {averages[key] == null ? "—" : key === "fg_pct" || key === "ft_pct" ? `${averages[key]}%` : averages[key].toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {!data ? "Preseason data is temporarily unavailable."
            : data.status === "identity_unmapped" ? "This player's ESPN identity has not been matched yet."
            : "No preseason games recorded for this player yet."}
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {data?.source ?? "ESPN"} · Preseason only. Shooting percentages use total makes and attempts. These numbers do not affect regular-season ranks or fantasy trade scores.
      </p>
    </section>
  );
}
