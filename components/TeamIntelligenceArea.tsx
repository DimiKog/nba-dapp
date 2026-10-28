import RecommendedMovesSection from "@/components/RecommendedMovesSection";
import TeamCategoryProfilePanel from "@/components/TeamCategoryProfile";
import type {
  FantasySeasonCategoryActuals,
  FantasyTeamCategoryProfile,
} from "@/lib/api";

/**
 * LDL/BDB Team Intelligence composition unit.
 * Swap with TeamDataArea in FantasyRosterPage to reverse page order.
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

        {showRecommendedMoves && (
          <RecommendedMovesSection league={league} teamId={teamId} embedded />
        )}

        {seasonProfile && (
          showRecommendedMoves ? (
            <details className="mt-6 overflow-hidden rounded-xl border border-slate-200/90 bg-white/90 open:shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-800 marker:content-none dark:text-slate-100 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>Full category analysis</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Performance · Fantrax rank · Roster potential
                  </span>
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
          ) : (
            <div className="mt-3">
              <TeamCategoryProfilePanel
                seasonProfile={seasonProfile}
                windowProfile={windowProfile}
                seasonActuals={seasonActuals}
                league={league}
                teamId={teamId}
                presentation="secondary"
              />
            </div>
          )
        )}
      </div>
    </section>
  );
}
