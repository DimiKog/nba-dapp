import type { ReactNode } from "react";
import {
  discoveryLeagueLabel,
  type DiscoveryLeagueSlug,
} from "@/lib/discoveryLeagues";
import type { DiscoveryView } from "@/lib/discoveryViews";

/**
 * Compact league/team context strip and Fit strategy slot contract.
 * Slice 0 only establishes layout — no fake strategy data.
 */
export default function DiscoveryContextArea({
  league,
  view,
  teamLabel,
  strategySlot,
}: {
  league: DiscoveryLeagueSlug;
  view: DiscoveryView;
  teamLabel?: string | null;
  strategySlot?: ReactNode;
}) {
  const showFitSlot = view === "fit";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">
          {discoveryLeagueLabel(league)}
        </span>
        {teamLabel ? (
          <>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden>
              ·
            </span>
            <span>
              Team context: <span className="font-semibold text-slate-800 dark:text-slate-100">{teamLabel}</span>
            </span>
          </>
        ) : (
          view === "fit" && (
            <>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                ·
              </span>
              <span className="text-slate-500">Team context will appear here when Fit is connected.</span>
            </>
          )
        )}
      </div>

      {showFitSlot && (
        <section
          aria-label="Strategy context"
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50"
        >
          {strategySlot ?? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Strategy summary for Fit to my plan will mount here in a later slice
              (System Recommended TARGET categories first; PROTECT / FLEX / PUNT secondary).
              No recommendation score is shown.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
