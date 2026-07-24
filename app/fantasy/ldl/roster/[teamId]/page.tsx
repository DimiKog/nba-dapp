import Image from "next/image";
import Link from "next/link";
import {
  fetchFantasyRoster,
  fetchFantasyRosterPerformance,
  photoUrl,
} from "@/lib/api";
import RosterPerformanceTable from "@/components/RosterPerformanceTable";
import { notFound } from "next/navigation";

export default async function LDLRosterPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  let roster;
  let performance = null;
  try {
    const [rosterResult, performanceResult] = await Promise.all([
      fetchFantasyRoster("ldl", teamId),
      fetchFantasyRosterPerformance("ldl", teamId).catch(() => null),
    ]);
    roster = rosterResult;
    performance = performanceResult;
  } catch {
    notFound();
  }

  const active  = roster.players.filter((p) => p.status === "Active");
  const reserve = roster.players.filter((p) => p.status === "Reserve");
  const ir      = roster.players.filter((p) => p.status === "IR");

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-10">
      <Link href="/fantasy/ldl" className="text-sm text-blue-500 hover:underline">
        ← LDL Standings
      </Link>

      <div className="mt-6 flex items-center gap-4">
        {roster.logo && (
          <Image src={roster.logo} alt={roster.team_name ?? ""} width={56} height={56} className="h-14 w-14 rounded-full" unoptimized />
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{roster.team_name}</h1>
          {roster.owner && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Owner: {roster.owner}</p>
          )}
        </div>
      </div>

      {performance ? (
        <RosterPerformanceTable performance={performance} />
      ) : (
      <div className="mt-8 space-y-6">
        {[
          { label: "Active", players: active },
          { label: "Reserve", players: reserve },
          { label: "Injured Reserve", players: ir },
        ].map(({ label, players }) =>
          players.length === 0 ? null : (
            <div key={label}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Player</th>
                      <th className="px-4 py-2 text-left hidden sm:table-cell">NBA Team</th>
                      <th className="px-4 py-2 text-left">Pos</th>
                      <th className="px-4 py-2 text-right">2026-27 Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {players.map((p) => {
                      const photo = photoUrl(p.photo, p.nba_id);
                      return (
                        <tr key={p.name} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                {photo ? (
                                  <Image src={photo} alt={p.name} fill className="object-cover" unoptimized />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                                    {p.name[0]}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                                {p.injury && (
                                  <p className="text-xs text-red-500 truncate max-w-[180px]">{p.injury}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                            {p.nba_team_short || p.nba_team || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{p.position}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                            {p.salary_2026_27 ?? <span className="text-slate-400">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
      )}
    </main>
  );
}
