import Image from "next/image";
import Link from "next/link";
import type { FantasyTeam } from "@/lib/api";

type LeagueSlug = "ldl" | "bdb";

export default function FantasyLeagueStandings({
  active,
  teams,
}: {
  active: LeagueSlug;
  teams: FantasyTeam[];
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Fantasy</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">2026-27 Season</p>
        </div>
        <Link href="/" className="text-sm text-blue-500 hover:underline">← NBA Home</Link>
      </div>

      <LeagueTabs active={active} />

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="w-10 px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-center">W</th>
              <th className="px-4 py-3 text-center">L</th>
              <th className="hidden px-4 py-3 text-center sm:table-cell">T</th>
              <th className="px-4 py-3 text-right">Cap status</th>
              <th className="hidden px-4 py-3 text-right lg:table-cell">PF</th>
              <th className="hidden px-4 py-3 text-right lg:table-cell">PA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {teams.map((team) => (
              <tr key={team.team_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="px-4 py-3 font-medium tabular-nums text-slate-400">{team.rank ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/fantasy/${active}/roster/${team.team_id}`} className="group flex items-center gap-3">
                    {team.logo && (
                      <Image src={team.logo} alt={team.name} width={32} height={32} className="rounded-full" unoptimized />
                    )}
                    <span className="font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                      {team.name}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-slate-700 dark:text-slate-300">{team.wins ?? "—"}</td>
                <td className="px-4 py-3 text-center tabular-nums text-slate-700 dark:text-slate-300">{team.losses ?? "—"}</td>
                <td className="hidden px-4 py-3 text-center tabular-nums text-slate-500 dark:text-slate-400 sm:table-cell">{team.ties ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <CapStatus team={team} />
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400 lg:table-cell">{team.points_for ?? "—"}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400 lg:table-cell">{team.points_against ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function CapStatus({ team }: { team: FantasyTeam }) {
  if (team.cap_status === "at_cap") {
    return <span className="font-semibold text-slate-600 dark:text-slate-300">At cap</span>;
  }
  if (
    (team.cap_status !== "over" && team.cap_status !== "under")
    || team.cap_difference === null
  ) {
    return <span className="text-slate-400">Unavailable</span>;
  }

  const amount = compactMoney(Math.abs(team.cap_difference));
  const over = team.cap_status === "over";
  return (
    <span className={`font-bold tabular-nums ${over ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
      {amount} {over ? "over" : "under"}
    </span>
  );
}

function compactMoney(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

function LeagueTabs({ active }: { active: LeagueSlug }) {
  return (
    <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {(["ldl", "bdb"] as const).map((league) => (
        <Link
          key={league}
          href={`/fantasy/${league}`}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
            active === league
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {league === "ldl" ? "LDL" : "BδB"}
        </Link>
      ))}
    </div>
  );
}
