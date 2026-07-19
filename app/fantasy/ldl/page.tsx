import Image from "next/image";
import Link from "next/link";
import { fetchFantasyStandings } from "@/lib/api";

export default async function LDLPage() {
  let teams = [];
  try {
    teams = await fetchFantasyStandings("ldl");
  } catch {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <LeagueTabs active="ldl" />
        <p className="mt-8 text-sm text-red-500">Could not load standings. Check backend connection.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Fantasy</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">2026-27 Season</p>
        </div>
        <Link href="/" className="text-sm text-blue-500 hover:underline">← NBA Home</Link>
      </div>

      <LeagueTabs active="ldl" />

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-center">W</th>
              <th className="px-4 py-3 text-center">L</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">T</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">PF</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">PA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {teams.map((team) => (
              <tr key={team.team_id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <td className="px-4 py-3 text-slate-400 tabular-nums font-medium">{team.rank ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/fantasy/ldl/roster/${team.team_id}`} className="flex items-center gap-3 group">
                    {team.logo && (
                      <Image src={team.logo} alt={team.name} width={32} height={32} className="rounded-full" unoptimized />
                    )}
                    <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {team.name}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 tabular-nums">{team.wins ?? "—"}</td>
                <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 tabular-nums">{team.losses ?? "—"}</td>
                <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 tabular-nums hidden sm:table-cell">{team.ties ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 tabular-nums hidden md:table-cell">{team.points_for ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 tabular-nums hidden md:table-cell">{team.points_against ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function LeagueTabs({ active }: { active: "ldl" | "bdb" }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit">
      <Link
        href="/fantasy/ldl"
        className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
          active === "ldl"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        }`}
      >
        LDL
      </Link>
      <Link
        href="/fantasy/bdb"
        className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
          active === "bdb"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        }`}
      >
        BδB
      </Link>
    </div>
  );
}
