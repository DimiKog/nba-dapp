import type { FantasyRadarPlayer } from "@/lib/api";

type MinutesTrend = FantasyRadarPlayer["minutes_trend"];

export default function MinutesTrendEvidence({ trend }: { trend: MinutesTrend }) {
  if (!trend || trend.basis !== "completed_game_logs" || trend.minutes == null || trend.previous_minutes == null) return null;

  const state = trend.state;
  if (!["increase", "early_increase", "decrease", "early_decrease"].includes(state)) return null;
  const rising = state === "increase" || state === "early_increase";
  const early = state === "early_increase" || state === "early_decrease";
  const label = `${early ? "Early " : ""}Minutes ${rising ? "↑" : "↓"}`;
  const tone = early
    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
    : rising
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";

  return (
    <details className="mt-2 text-xs text-slate-600 dark:text-slate-300">
      <summary className="w-fit cursor-pointer list-none" aria-label={`${label}, show minutes evidence`}>
        <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold ${tone}`}>{label}</span>
      </summary>
      <p className="mt-2 tabular-nums">
        {trend.minutes.toFixed(1)} MIN in the latest {trend.sample_games} recorded games vs {trend.previous_minutes.toFixed(1)} MIN across {trend.previous_games} games in {trend.previous_season}.
        {early ? " Early sample; " : " "}Observed minutes, not a projection of future role.
      </p>
    </details>
  );
}
