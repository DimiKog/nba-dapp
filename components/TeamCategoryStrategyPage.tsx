import "server-only";

import Link from "next/link";
import TeamCategoryStrategyEditor from "@/components/TeamCategoryStrategyEditor";
import { loadCurrentFantasyAccess, membershipFor } from "@/lib/fantasySessionServer";
import type { TeamCategoryStrategy } from "@/lib/teamCategoryStrategy";
import { readTeamCategoryStrategy } from "@/lib/teamCategoryStrategyServer";

export default async function TeamCategoryStrategyPage({
  league,
}: {
  league: "ldl" | "bdb";
}) {
  const access = await loadCurrentFantasyAccess();
  const membership = membershipFor(access?.session ?? null, league);
  const leagueName = league === "ldl" ? "LDL" : "BδB";

  if (!access || !membership?.fantrax_team_id) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <UnavailableCard
          title="Team strategy unavailable"
          detail={`Your account does not have an active ${leagueName} team mapping.`}
          href={`/fantasy/${league}/my-team`}
        />
      </main>
    );
  }

  const response = await readTeamCategoryStrategy(
    league,
    access.identityHeaders,
  ).catch(() => null);
  const strategy = response?.ok
    ? await response.json() as TeamCategoryStrategy
    : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link
        href={`/fantasy/${league}/roster/${encodeURIComponent(membership.fantrax_team_id)}`}
        className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to {membership.franchise_name}
      </Link>

      <header className="mt-6 border-b border-slate-200 pb-6 dark:border-slate-700">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
          {leagueName} · {membership.franchise_name}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          Team category strategy
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Declare which categories should guide your trades and free-agent moves.
          This strategy is shared by every active manager of this franchise.
        </p>
      </header>

      <div className="mt-6">
        {strategy ? (
          <TeamCategoryStrategyEditor league={league} initialStrategy={strategy} />
        ) : (
          <UnavailableCard
            title="Strategy service unavailable"
            detail="The backend schema or API may not be active in this environment yet. No strategy data was changed."
            href={`/fantasy/${league}/roster/${encodeURIComponent(membership.fantrax_team_id)}`}
          />
        )}
      </div>
    </main>
  );
}

function UnavailableCard({
  title,
  detail,
  href,
}: {
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
      <h1 className="text-xl font-black text-amber-900 dark:text-amber-200">{title}</h1>
      <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">{detail}</p>
      <Link href={href} className="mt-5 inline-flex rounded-lg border border-amber-300 px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/60">
        Return to team
      </Link>
    </section>
  );
}
