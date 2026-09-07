import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchFantasyLeagues } from "@/lib/api";

type LeagueSlug = "ldl" | "bdb";

export default async function PersonalTeamRedirect({
  league,
}: {
  league: LeagueSlug;
}) {
  const leagues = await fetchFantasyLeagues().catch(() => []);
  const configuredLeague = leagues.find(
    (item) => item.slug === league && item.enabled,
  );

  if (configuredLeague?.personal_team_id) {
    redirect(
      `/fantasy/${league}/roster/${encodeURIComponent(configuredLeague.personal_team_id)}`,
    );
  }

  const leagueName = league === "ldl" ? "LDL" : "BδB";
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
          {leagueName}
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          Personal team unavailable
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          This league does not currently have a personal team configured.
        </p>
        <Link
          href={`/fantasy/${league}`}
          className="mt-5 inline-flex rounded-lg border border-amber-300 px-3 py-2 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/60"
        >
          Return to {leagueName} standings
        </Link>
      </section>
    </main>
  );
}
