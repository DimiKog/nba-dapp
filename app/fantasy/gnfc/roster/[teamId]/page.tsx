import CategoryNeedsSection from "@/components/CategoryNeedsSection";
import FantasyRosterPage from "@/components/FantasyRosterPage";
import GnfcAvailabilityNotice from "@/components/GnfcAvailabilityNotice";
import {
  fetchFantasyCategoryTargets,
  fetchFantasyLeagues,
  fetchFantasyRoster,
  fetchFantasyStandings,
} from "@/lib/api";
import { loadCurrentFantasyAccess, membershipFor } from "@/lib/fantasySessionServer";

/**
 * GNFC personal Team page — shared FantasyRosterPage / Team Intelligence shell.
 * CategoryNeedsSection remains until Step 4C Discovery Fit migration.
 */
export default async function GnfcRosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const access = await loadCurrentFantasyAccess();
  const isPersonalTeam = membershipFor(access?.session ?? null, "gnfc")?.fantrax_team_id === teamId;

  const [teams, leagues, roster] = await Promise.all([
    fetchFantasyStandings("gnfc").catch(() => []),
    // Availability readiness must not be served from a stale cache.
    fetchFantasyLeagues({ cache: "no-store" }).catch(() => []),
    fetchFantasyRoster("gnfc", teamId).catch(() => null),
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
      hasTargets={showTargets}
      targetsLabel="2026–27 free agents"
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
        showTargets && roster ? (
          <CategoryNeedsSection
            league="gnfc"
            teamId={teamId}
            teamName={roster.team_name}
            initialTargets={initialTargets}
            isPersonalTeam
          />
        ) : null
      }
    />
  );
}
