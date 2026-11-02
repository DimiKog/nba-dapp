import Link from "next/link";
import FantasyRosterPage from "@/components/FantasyRosterPage";
import GnfcAvailabilityNotice from "@/components/GnfcAvailabilityNotice";
import { fetchFantasyLeagues, fetchFantasyStandings } from "@/lib/api";
import { buildDiscoveryHref } from "@/lib/discoveryViews";
import { loadCurrentFantasyAccess, membershipFor } from "@/lib/fantasySessionServer";

/**
 * GNFC personal Team page — shared FantasyRosterPage / Team Intelligence shell.
 * Player-target discovery lives in Players → Fit to my plan (Step 4C).
 */
export default async function GnfcRosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const access = await loadCurrentFantasyAccess();
  const isPersonalTeam = membershipFor(access?.session ?? null, "gnfc")?.fantrax_team_id === teamId;

  const [teams, leagues] = await Promise.all([
    fetchFantasyStandings("gnfc").catch(() => []),
    // Availability readiness must not be served from a stale cache.
    fetchFantasyLeagues({ cache: "no-store" }).catch(() => []),
  ]);

  const config = leagues.find((league) => league.slug === "gnfc");
  const availabilityReady = Boolean(config?.availability_ready);
  const fitHref = buildDiscoveryHref({
    view: "fit",
    league: "gnfc",
    team: teamId,
  });

  return (
    <FantasyRosterPage
      league="gnfc"
      teamId={teamId}
      discoveryEnabled={availabilityReady}
      availabilityNotice={
        !availabilityReady ? (
          <div className="mt-7">
            <GnfcAvailabilityNotice
              joinedTeams={teams.length}
              expectedTeams={config?.expected_team_count ?? 12}
              availabilityReady={false}
            />
          </div>
        ) : null
      }
      afterData={
        isPersonalTeam && availabilityReady ? (
          <section className="mt-8 scroll-mt-32 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              Player discovery
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              Find players that fit your plan
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Strategy-aware free-agent and trade-target discovery lives in Players → Fit to my plan.
            </p>
            <Link
              href={fitHref}
              className="mt-4 inline-flex w-fit rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
            >
              Open Fit to my plan →
            </Link>
          </section>
        ) : null
      }
    />
  );
}
