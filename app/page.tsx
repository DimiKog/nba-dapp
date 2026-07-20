import Image from "next/image";
import Link from "next/link";
import { fetchScoreboard, fetchNews, fetchFantasyStandings } from "@/lib/api";

export default async function Home() {
  const [games, news, ldlTeams] = await Promise.all([
    fetchScoreboard(),
    fetchNews(6),
    fetchFantasyStandings("ldl").catch(() => []),
  ]);

  const top5ldl = ldlTeams.slice(0, 5);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">

      {/* Scoreboard */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          NBA Scoreboard
        </h2>
        {games.length === 0 ? (
          <p className="text-sm text-slate-400">No games today.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {games.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm min-w-[220px]">
                <TeamScore team={g.away} />
                <span className="text-xs text-slate-400 font-medium">@</span>
                <TeamScore team={g.home} />
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${g.completed ? "bg-slate-100 dark:bg-slate-800 text-slate-500" : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"}`}>
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* LDL + News */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* LDL Snapshot */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">LDL Standings</h2>
            <Link href="/fantasy/ldl" className="text-xs text-blue-500 hover:underline">View all →</Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Team</th>
                  <th className="px-4 py-2 text-center">W</th>
                  <th className="px-4 py-2 text-center">L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {top5ldl.map((t) => (
                  <tr key={t.team_id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-2 text-slate-400 tabular-nums">{t.rank}</td>
                    <td className="px-4 py-2">
                      <Link href={`/fantasy/ldl/roster/${t.team_id}`} className="flex items-center gap-2 group">
                        {t.logo && <Image src={t.logo} alt={t.name} width={24} height={24} className="rounded-full" unoptimized />}
                        <span className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[140px]">{t.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-center tabular-nums text-slate-700 dark:text-slate-300">{t.wins ?? "—"}</td>
                    <td className="px-4 py-2 text-center tabular-nums text-slate-700 dark:text-slate-300">{t.losses ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* News */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">NBA News</h2>
          <div className="space-y-3">
            {news.map((item, i) => (
              <a
                key={i}
                href={item.link ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
              >
                {item.image && (
                  <img src={item.image} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 transition-colors">
                    {item.headline}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {item.published ? new Date(item.published).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function TeamScore({ team }: { team: { name: string; short: string; logo: string | null; score: string | null; winner: boolean } }) {
  return (
    <div className="flex items-center gap-2">
      {team.logo && <img src={team.logo} alt={team.short} className="h-7 w-7 object-contain" />}
      <div>
        <p className={`text-sm font-bold ${team.winner ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
          {team.short}
        </p>
        <p className={`text-sm tabular-nums ${team.winner ? "font-bold text-slate-900 dark:text-slate-100" : "text-slate-500"}`}>
          {team.score ?? "—"}
        </p>
      </div>
    </div>
  );
}
