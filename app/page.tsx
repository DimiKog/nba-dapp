import Image from "next/image";
import Link from "next/link";
import { fetchTopContracts, photoUrl } from "@/lib/api";

export default async function Home() {
  const players = await fetchTopContracts(25);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Top Contracts</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">2026-27 Season</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">Player</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
              <th className="px-4 py-3 text-right">2026-27</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">2027-28</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">2028-29</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {players.map((p) => {
              const photo = photoUrl(p.photo, p.nba_id);
              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-4 py-3 text-slate-400 tabular-nums font-medium">{p.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/players/${p.id}`} className="flex items-center gap-3 group">
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
                        <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{p.position ?? "—"}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{p.team ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                    {p.contract["2026-27"] ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 tabular-nums hidden md:table-cell">
                    {p.contract["2027-28"] ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 tabular-nums hidden md:table-cell">
                    {p.contract["2028-29"] ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
