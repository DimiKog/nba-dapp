import CategoryNeedsSection from "@/components/CategoryNeedsSection";
import FantasyRosterPage from "@/components/FantasyRosterPage";
import GnfcAvailabilityNotice from "@/components/GnfcAvailabilityNotice";
import GnfcPowerSummary from "@/components/GnfcPowerSummary";
import RosterWatchPanel from "@/components/RosterWatchPanel";
import {
  fetchFantasyCategoryTargets,
  fetchFantasyLeagues,
  fetchFantasyRoster,
  fetchFantasyRosterPerformance,
  fetchFantasyStandings,
  fetchFantasyTeamCategoryProfile,
  fetchFantasyTeamPowerOutlook,
} from "@/lib/api";
import { loadCurrentFantasyAccess, membershipFor } from "@/lib/fantasySessionServer";

/**
 * GNFC personal Team page — shared FantasyRosterPage / Team Intelligence shell.
 * Legacy GNFC sections (Power Summary, Roster Watch, Category Needs) stay mounted
 * for production review; cleanup is intentionally deferred.
 */
export default async function GnfcRosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const access = await loadCurrentFantasyAccess();
  const isPersonalTeam = membershipFor(access?.session ?? null, "gnfc")?.fantrax_team_id === teamId;

  const [teams, leagues, roster, performance, seasonProfile, outlook] = await Promise.all([
    fetchFantasyStandings("gnfc").catch(() => []),
    // Availability readiness must not be served from a stale cache.
    fetchFantasyLeagues({ cache: "no-store" }).catch(() => []),
    fetchFantasyRoster("gnfc", teamId).catch(() => null),
    fetchFantasyRosterPerformance("gnfc", teamId).catch(() => null),
    fetchFantasyTeamCategoryProfile("gnfc", teamId).catch(() => null),
    fetchFantasyTeamPowerOutlook("gnfc").catch(() => null),
  ]);

  const config = leagues.find((league) => league.slug === "gnfc");
  const availabilityReady = Boolean(config?.availability_ready);
  const showTargets = isPersonalTeam && availabilityReady && Boolean(roster?.players.length);
  const initialTargets = showTargets
    ? await fetchFantasyCategoryTargets(
      "gnfc",
      teamId,
      { availability: "free_agent", actionScope: "all" },
      access?.identityHeaders,
    ).catch(() => null)
    : null;

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
      beforeIntelligence={
        isPersonalTeam && performance ? (
          <RosterWatchPanel
            league="gnfc"
            players={performance.players}
            hasTargets={showTargets}
          />
        ) : null
      }
      afterData={
        <>
          {(seasonProfile || outlook) && (
            <div className="mt-8 space-y-4">
              <GnfcPowerSummary outlook={outlook} teamId={teamId} />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Roster potential uses the current Fantrax roster and{" "}
                {seasonProfile?.window.season ?? "current-season"} NBA production. It is not the
                official Fantrax Season Stats ranking or a final-standings forecast.
              </p>
            </div>
          )}
          {showTargets && roster && (
            <CategoryNeedsSection
              league="gnfc"
              teamId={teamId}
              teamName={roster.team_name}
              initialTargets={initialTargets}
              isPersonalTeam
            />
          )}
        </>
      }
    />
  );
}
