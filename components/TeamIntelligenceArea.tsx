"use client";

import { useEffect, useState } from "react";
import { ApiResponseError, fetchRosterMoveDiscovery } from "@/lib/api";
import type {
  FantasySeasonCategoryActuals,
  FantasyTeamCategoryProfile,
} from "@/lib/api";
import type { RosterMoveDiscovery } from "@/lib/rosterMoveTypes";
import type { TeamPageLeagueSlug } from "@/lib/teamPageLeagues";
import RecommendedMovesSection, {
  type SharedDiscoveryState,
} from "@/components/RecommendedMovesSection";
import TeamCategoryProfilePanel from "@/components/TeamCategoryProfile";
import TeamIntelligenceSummary from "@/components/TeamIntelligenceSummary";
import TeamRecommendedStrategy from "@/components/TeamRecommendedStrategy";

type DiscoveryLoadState = SharedDiscoveryState["status"];

/**
 * Shared Team Intelligence composition unit (LDL / BδB / GNFC).
 * Swap with TeamDataArea in FantasyRosterPage to reverse page order.
 *
 * Personal teams: one shared roster-move-discovery request feeds
 * Recommended Strategy + Recommended Moves when discovery is enabled.
 */
export default function TeamIntelligenceArea({
  league,
  teamId,
  showRecommendedMoves,
  discoveryEnabled = true,
  seasonProfile,
  windowProfile,
  seasonActuals,
}: {
  league: TeamPageLeagueSlug;
  teamId: string;
  showRecommendedMoves: boolean;
  /**
   * When false (e.g. GNFC availability not ready), skip discovery fetch and
   * show an honest unavailable state instead of empty/misleading recommendations.
   */
  discoveryEnabled?: boolean;
  seasonProfile: FantasyTeamCategoryProfile | null;
  windowProfile: FantasyTeamCategoryProfile | null;
  seasonActuals: FantasySeasonCategoryActuals | null;
}) {
  if (!showRecommendedMoves && !seasonProfile) return null;

  return (
    <section id="intelligence" className="mt-10 scroll-mt-32">
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
          Team intelligence
        </p>

        {showRecommendedMoves ? (
          <PersonalIntelligence
            key={`${league}:${teamId}:${discoveryEnabled ? "on" : "off"}`}
            league={league}
            teamId={teamId}
            discoveryEnabled={discoveryEnabled}
            seasonProfile={seasonProfile}
            windowProfile={windowProfile}
            seasonActuals={seasonActuals}
          />
        ) : (
          <PublicIntelligence
            league={league}
            teamId={teamId}
            seasonProfile={seasonProfile!}
            windowProfile={windowProfile}
            seasonActuals={seasonActuals}
          />
        )}
      </div>
    </section>
  );
}

function PersonalIntelligence({
  league,
  teamId,
  discoveryEnabled,
  seasonProfile,
  windowProfile,
  seasonActuals,
}: {
  league: TeamPageLeagueSlug;
  teamId: string;
  discoveryEnabled: boolean;
  seasonProfile: FantasyTeamCategoryProfile | null;
  windowProfile: FantasyTeamCategoryProfile | null;
  seasonActuals: FantasySeasonCategoryActuals | null;
}) {
  const shared = useSharedDiscovery(league, teamId, discoveryEnabled);

  return (
    <>
      <div className="mt-3 grid gap-3 lg:grid-cols-2 lg:items-start">
        {seasonProfile && (
          <TeamIntelligenceSummary
            profile={seasonProfile}
            strategy={shared.discovery?.recommended_strategy}
            discoveryStatus={shared.status === "unavailable" ? "error" : shared.status}
          />
        )}
        <TeamRecommendedStrategy
          status={shared.status}
          strategy={shared.discovery?.recommended_strategy ?? null}
        />
      </div>

      <RecommendedMovesSection
        league={league}
        teamId={teamId}
        embedded
        sharedDiscovery={shared}
      />

      {seasonProfile && (
        <FullCategoryAnalysisDetails
          seasonProfile={seasonProfile}
          windowProfile={windowProfile}
          seasonActuals={seasonActuals}
          league={league}
          teamId={teamId}
        />
      )}
    </>
  );
}

function PublicIntelligence({
  league,
  teamId,
  seasonProfile,
  windowProfile,
  seasonActuals,
}: {
  league: TeamPageLeagueSlug;
  teamId: string;
  seasonProfile: FantasyTeamCategoryProfile;
  windowProfile: FantasyTeamCategoryProfile | null;
  seasonActuals: FantasySeasonCategoryActuals | null;
}) {
  return (
    <>
      <div className="mt-3">
        <TeamIntelligenceSummary
          profile={seasonProfile}
          discoveryStatus="idle"
        />
      </div>
      <div className="mt-4">
        <TeamCategoryProfilePanel
          seasonProfile={seasonProfile}
          windowProfile={windowProfile}
          seasonActuals={seasonActuals}
          league={league}
          teamId={teamId}
          presentation="secondary"
        />
      </div>
    </>
  );
}

function FullCategoryAnalysisDetails({
  seasonProfile,
  windowProfile,
  seasonActuals,
  league,
  teamId,
}: {
  seasonProfile: FantasyTeamCategoryProfile;
  windowProfile: FantasyTeamCategoryProfile | null;
  seasonActuals: FantasySeasonCategoryActuals | null;
  league: TeamPageLeagueSlug;
  teamId: string;
}) {
  return (
    <details className="group mt-6 overflow-hidden rounded-xl border border-blue-200/90 bg-white shadow-sm open:shadow-md dark:border-blue-900/50 dark:bg-slate-900/80">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50 marker:content-none dark:text-blue-300 dark:hover:bg-blue-950/40 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <span>View full category analysis</span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Performance · Fantrax rank · Roster potential
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 text-base font-black transition group-open:rotate-90"
        >
          →
        </span>
      </summary>
      <div className="border-t border-slate-200 dark:border-slate-700">
        <TeamCategoryProfilePanel
          seasonProfile={seasonProfile}
          windowProfile={windowProfile}
          seasonActuals={seasonActuals}
          league={league}
          teamId={teamId}
          presentation="secondary"
        />
      </div>
    </details>
  );
}

const AVAILABILITY_UNAVAILABLE: SharedDiscoveryState = {
  status: "unavailable",
  discovery: null,
  error: "Free-agent recommendations unlock when league availability is ready.",
};

function useSharedDiscovery(
  league: TeamPageLeagueSlug,
  teamId: string,
  discoveryEnabled: boolean,
): SharedDiscoveryState {
  const [status, setStatus] = useState<DiscoveryLoadState>("loading");
  const [discovery, setDiscovery] = useState<RosterMoveDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!discoveryEnabled) return;
    let active = true;
    fetchRosterMoveDiscovery(league, teamId, { basis: "season" })
      .then((result) => {
        if (!active) return;
        setDiscovery(result);
        setError(null);
        const hasMoves = Object.values(result.tiers ?? {}).some(
          (tier) => (tier?.returned?.length ?? 0) > 0,
        );
        setStatus(hasMoves ? "ready" : "empty");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setDiscovery(null);
        const message =
          err instanceof ApiResponseError
            ? err.message
            : "Could not load team intelligence";
        // Backend availability gate returns 503 with availability_not_ready /
        // incomplete_league_roster — treat as honest unavailable, not a soft empty list.
        if (
          (err instanceof ApiResponseError && err.status === 503)
          || /availability|not (active|ready)|incomplete/i.test(message)
        ) {
          setStatus("unavailable");
          setError(message);
          return;
        }
        setStatus("error");
        setError(message);
      });
    return () => {
      active = false;
    };
  }, [league, teamId, discoveryEnabled]);

  if (!discoveryEnabled) return AVAILABILITY_UNAVAILABLE;
  return { status, discovery, error };
}
