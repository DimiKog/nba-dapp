"use client";

import Link from "next/link";
import { useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import type { FantasyTeam } from "@/lib/api";

type LeagueSlug = "ldl" | "bdb";

export default function HomeLeagueStandings({
  ldlTeams,
  bdbTeams,
}: {
  ldlTeams: FantasyTeam[];
  bdbTeams: FantasyTeam[];
}) {
  const [league, setLeague] = useState<LeagueSlug>("ldl");
  const teams = (league === "ldl" ? ldlTeams : bdbTeams).slice(0, 5);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Fantasy standings
          </h2>
          <div className="mt-2 flex w-fit gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(["ldl", "bdb"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLeague(item)}
                className={`rounded-md px-4 py-1.5 text-xs font-bold transition-colors ${
                  league === item
                    ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {item === "ldl" ? "LDL" : "BδB"}
              </button>
            ))}
          </div>
        </div>
        <Link href={`/fantasy/${league}`} className="self-end text-xs text-blue-500 hover:underline">
          View all →
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {teams.length ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="w-10 px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-3 py-2 text-right">Cap +/-</th>
                <th className="px-3 py-2 text-center">W–L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {teams.map((team) => (
                <tr key={team.team_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-3 py-2.5 tabular-nums text-slate-400">{team.rank ?? "—"}</td>
                  <td className="min-w-0 px-3 py-2.5">
                    <Link href={`/fantasy/${league}/roster/${team.team_id}`} className="group flex min-w-0 items-center gap-2">
                      <TeamLogo league={league} name={team.name} logo={team.logo} size={26} />
                      <span className="max-w-[150px] truncate font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                        {team.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <CapDifference team={team} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center tabular-nums text-slate-700 dark:text-slate-300">
                    {team.wins ?? "—"}–{team.losses ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-center text-sm text-slate-400">
            {league === "ldl" ? "LDL" : "BδB"} standings are temporarily unavailable.
          </p>
        )}
      </div>
    </section>
  );
}

function CapDifference({ team }: { team: FantasyTeam }) {
  if (team.cap_status === "at_cap") {
    return <span className="font-bold tabular-nums text-slate-600 dark:text-slate-300">$0</span>;
  }
  if (
    (team.cap_status !== "over" && team.cap_status !== "under")
    || team.cap_difference === null
  ) {
    return <span className="text-slate-400">—</span>;
  }

  const over = team.cap_status === "over";
  return (
    <span className={`whitespace-nowrap font-bold tabular-nums ${over ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
      {over ? "−" : "+"}{compactMoney(Math.abs(team.cap_difference))}
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
