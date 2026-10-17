import Link from "next/link";
import { fetchFantasyTeamPowerOutlook, type FantasyTeamPowerOutlook } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PowerRankingPage() {
  const leagues = await Promise.all((["ldl", "bdb"] as const).map(async (slug) => ({
    slug,
    outlook: await fetchFantasyTeamPowerOutlook(slug).catch(() => null),
  })));

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">← Home</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">League comparison · pilot</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Provisional roster strength</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          A snapshot of how complete rosters compare across categories. It is not a prediction of final standings:
          schedules, active lineups, injuries, role changes and future transactions are not projected.
        </p>
      </div>
      {leagues.map(({ slug, outlook }) => (
        <LeaguePowerTable key={slug} slug={slug} outlook={outlook} />
      ))}
    </main>
  );
}

function LeaguePowerTable({
  slug,
  outlook,
}: {
  slug: "ldl" | "bdb";
  outlook: FantasyTeamPowerOutlook | null;
}) {
  return (
    <section id={slug} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">{slug === "ldl" ? "LDL" : "BδB"}</h2>
        <p className="mt-1 text-xs text-slate-500">
          Current roster · {outlook?.stats_season ?? "2025-26"} historical stats
          {outlook?.snapshot?.captured_at ? ` · roster sync ${outlook.snapshot.captured_at.slice(0, 10)}` : ""}
        </p>
      </div>
      {!outlook ? (
        <p className="p-5 text-sm text-slate-500">Comparison is temporarily unavailable.</p>
      ) : outlook.status === "incomplete_league" ? (
        <p className="p-5 text-sm text-amber-700 dark:text-amber-300">
          Comparison withheld: {outlook.teams_found} of {outlook.teams_expected ?? "expected"} roster snapshots are available.
        </p>
      ) : outlook.status === "insufficient_stats" ? (
        <p className="p-5 text-sm text-slate-500">Not enough historical category data to rank these rosters.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60">
                <tr>
                  <th scope="col" className="px-5 py-3">Rank</th>
                  <th scope="col" className="px-3 py-3">Team</th>
                  <th scope="col" className="px-3 py-3">Category index</th>
                  <th scope="col" className="px-3 py-3">Best categories</th>
                  <th scope="col" className="px-3 py-3">Main gaps</th>
                  <th scope="col" className="px-5 py-3">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {outlook.teams.map((row) => (
                  <tr key={row.team.id} className="text-slate-700 dark:text-slate-300">
                    <td className="px-5 py-3 font-bold tabular-nums">{row.rank == null ? "—" : `#${row.rank}`}</td>
                    <td className="px-3 py-3 font-semibold text-slate-950 dark:text-white">{row.team.name}</td>
                    <td className="px-3 py-3 tabular-nums">{row.all_play_share == null ? "—" : `${Math.round(row.all_play_share * 100)}/100`}</td>
                    <td className="px-3 py-3 text-emerald-700 dark:text-emerald-400">{row.strengths.join(" · ") || "—"}</td>
                    <td className="px-3 py-3 text-rose-700 dark:text-rose-400">{row.weaknesses.join(" · ") || "—"}</td>
                    <td className="px-5 py-3 text-xs">
                      {row.categories_scored}/{row.categories_total} cats · {row.players_included} players
                      {row.players_missing_stats > 0 ? ` · ${row.players_missing_stats} missing` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-200 px-5 py-4 text-xs leading-relaxed text-slate-500 dark:border-slate-700">
            The index averages each category&apos;s relative rank against the league (equal weight); 100 means strongest in every category.
            It is not a win probability. Missing categories remain unranked; missing player stats make the comparison provisional.
            Full rosters include reserve and injured-reserve players, not projected active lineups.
          </p>
        </>
      )}
    </section>
  );
}
