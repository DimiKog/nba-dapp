"use client";

import { useEffect, useState } from "react";
import { ApiResponseError, fetchRosterMoveDiscovery } from "@/lib/api";
import type {
  FantasySeasonCategoryActuals,
  FantasyTeamCategoryProfile,
} from "@/lib/api";
import type { RosterMoveDiscovery } from "@/lib/rosterMoveTypes";
import RecommendedMovesSection, {
  type SharedDiscoveryState,
} from "@/components/RecommendedMovesSection";
import TeamCategoryProfilePanel from "@/components/TeamCategoryProfile";
import TeamIntelligenceSummary from "@/components/TeamIntelligenceSummary";
import TeamRecommendedStrategy from "@/components/TeamRecommendedStrategy";

type DiscoveryLoadState = SharedDiscoveryState["status"];

/**
 * LDL/BDB Team Intelligence composition unit.
 * Swap with TeamDataArea in FantasyRosterPage to reverse page order.
 *
 * Personal teams: one shared roster-move-discovery request feeds
 * Recommended Strategy + Recommended Moves.
 */
export default function TeamIntelligenceArea({
  league,
  teamId,
  showRecommendedMoves,
  seasonProfile,
  windowProfile,
  seasonActuals,
}: {
  league: "ldl" | "bdb";
  teamId: string;
  showRecommendedMoves: boolean;
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
            key={`${league}:${teamId}`}
            league={league}
            teamId={teamId}
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
  seasonProfile,
  windowProfile,
  seasonActuals,
}: {
  league: "ldl" | "bdb";
  teamId: string;
  seasonProfile: FantasyTeamCategoryProfile | null;
  windowProfile: FantasyTeamCategoryProfile | null;
  seasonActuals: FantasySeasonCategoryActuals | null;
}) {
  const shared = useSharedDiscovery(league, teamId);

  return (
    <>
      <div className="mt-3 grid gap-3 lg:grid-cols-2 lg:items-start">
        {seasonProfile && (
          <TeamIntelligenceSummary
            profile={seasonProfile}
            strategy={shared.discovery?.recommended_strategy}
            discoveryStatus={shared.status}
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
  league: "ldl" | "bdb";
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
  league: "ldl" | "bdb";
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

function useSharedDiscovery(
  league: "ldl" | "bdb",
  teamId: string,
): SharedDiscoveryState {
  const [status, setStatus] = useState<DiscoveryLoadState>("loading");
  const [discovery, setDiscovery] = useState<RosterMoveDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        setStatus("error");
        setError(
          err instanceof ApiResponseError
            ? err.message
            : "Could not load team intelligence",
        );
      });
    return () => {
      active = false;
    };
  }, [league, teamId]);

  return { status, discovery, error };
}
