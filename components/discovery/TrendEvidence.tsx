import MinutesTrendEvidence from "@/components/MinutesTrendEvidence";
import type { FantasyRadarPlayer } from "@/lib/api";
import { formatFantasyStat, resolveFantasyCategories } from "@/lib/fantasyCategories";

export function TrendChips({
  trends,
}: {
  trends: Record<string, { delta: number | null; improved: boolean | null }>;
}) {
  const improvements = Object.entries(trends)
    .filter(([, trend]) => trend.improved && trend.delta != null)
    .sort((a, b) => Math.abs(b[1].delta ?? 0) - Math.abs(a[1].delta ?? 0))
    .slice(0, 4);
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {improvements.length ? improvements.map(([label, trend]) => (
        <span
          key={label}
          className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          {label} {trend.delta! > 0 ? "+" : ""}{trend.delta}
        </span>
      )) : (
        <span className="text-xs text-slate-400">No recent category improvement.</span>
      )}
    </div>
  );
}

export function RadarScoreExplanation({ player }: { player: FantasyRadarPlayer }) {
  const explanation = player.trend_explanation;
  if (!explanation) return null;
  const contributions = [...explanation.category_contributions]
    .sort((a, b) => Math.abs(b.standardized_delta) - Math.abs(a.standardized_delta));
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50">
      <p className="font-bold text-slate-900 dark:text-white">
        {explanation.status === "scored"
          ? `Recent trend ${explanation.score != null && explanation.score >= 0 ? "+" : ""}${explanation.score?.toFixed(2) ?? "—"} · ${explanation.recent_games} recent games`
          : `No trend score yet · ${explanation.recent_games}/${explanation.minimum_recent_games} recent games`}
      </p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        {explanation.status === "scored"
          ? "Change against this player's season average, standardized across eligible free agents. Not a team-fit or pickup recommendation."
          : "The recent sample does not meet the minimum; season stats are context only."}
      </p>
      {contributions.length > 0 && (
        <details className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
          <summary className="cursor-pointer font-bold text-blue-700 dark:text-blue-300">
            Which categories drive the trend?
          </summary>
          <ul className="mt-2 space-y-1">
            {contributions.map((item) => (
              <li key={item.key} className="flex justify-between gap-2">
                <span>{item.label}: {item.season.toFixed(2)} → {item.recent.toFixed(2)}</span>
                <strong className={item.standardized_delta >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}>
                  {item.standardized_delta >= 0 ? "+" : ""}{item.standardized_delta.toFixed(2)}
                </strong>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Salary, tokens and your team needs do not enter this score.
          </p>
        </details>
      )}
    </div>
  );
}

export function SeasonContextChips({
  player,
  categories,
}: {
  player: FantasyRadarPlayer;
  categories: string[];
}) {
  const columns = resolveFantasyCategories(categories).slice(0, 5);
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {columns.map((category) => (
        <span
          key={category.key}
          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          {category.label} {formatFantasyStat(player.season_average, category)}
        </span>
      ))}
    </div>
  );
}

export { MinutesTrendEvidence };
