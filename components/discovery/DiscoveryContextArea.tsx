import type { ReactNode } from "react";
import {
  discoveryLeagueLabel,
  type DiscoveryLeagueSlug,
} from "@/lib/discoveryLeagues";
import type { DiscoveryView } from "@/lib/discoveryViews";

/**
 * Compact league/team context strip.
 * Fit owns team + System Recommended Strategy presentation inside DiscoveryFitView.
 * Optional strategySlot remains available if a parent wants to inject summary above results.
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
        ) : null}
      </div>

      {view === "fit" && strategySlot ? (
        <section aria-label="Strategy context">
          {strategySlot}
        </section>
      ) : null}
    </div>
  );
}
