import type { FantasyTeamPowerOutlook } from "@/lib/api";

export default function GnfcPowerSummary({
  outlook,
  teamId,
}: {
  outlook: FantasyTeamPowerOutlook | null;
  teamId: string;
}) {
  const row = outlook?.status === "ready"
    ? outlook.teams.find((team) => team.team.id === teamId)
    : null;
  if (!outlook || !row || row.rank == null) {
    return (
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        Provisional roster comparison is unavailable until the complete 12-team snapshot and category data are verified.
      </section>
    );
  }

  const tier = row.tier === "top_third" ? "top third" : row.tier === "bottom_third" ? "bottom third" : "middle third";
  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 text-sm dark:border-indigo-800 dark:bg-indigo-950/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Provisional roster strength</p>
      <p className="mt-1 font-black text-indigo-950 dark:text-indigo-100">#{row.rank} of {outlook.teams_found} · {tier}</p>
      <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
        Relative strengths: {row.strengths.join(" · ") || "none in the top third"}. Main gaps: {row.weaknesses.join(" · ") || "none in the bottom third"}.
      </p>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Current roster · {outlook.stats_season} historical stats · not a final-standings forecast
        {row.players_missing_stats ? ` · ${row.players_missing_stats} without stats` : ""}
        {outlook.snapshot?.captured_at ? ` · roster sync ${outlook.snapshot.captured_at.slice(0, 10)}` : ""}
      </p>
    </section>
  );
}
