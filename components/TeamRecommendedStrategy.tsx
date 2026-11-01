import type { RosterMoveRecommendedStrategy } from "@/lib/rosterMoveTypes";
import {
  formatStrategyCategoryChip,
  groupRecommendedStrategy,
} from "@/lib/teamIntelligencePresentation";

type DiscoveryStatus = "loading" | "ready" | "empty" | "error" | "unavailable";

/**
 * System recommended strategy from discovery.recommended_strategy.
 * Distinct from the manager-declared Category Strategy tool.
 */
export default function TeamRecommendedStrategy({
  status,
  strategy,
}: {
  status: DiscoveryStatus;
  strategy: RosterMoveRecommendedStrategy | null;
}) {
  const groups = groupRecommendedStrategy(strategy);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/80 sm:p-4">
      <h3 className="text-sm font-black text-slate-950 dark:text-white">
        Recommended strategy
      </h3>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        Based on your current category profile
      </p>

      {status === "loading" && <StrategySkeleton />}

      {status === "unavailable" && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          System recommended strategy unlocks when free-agent availability is ready.
        </p>
      )}

      {status === "error" && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          System recommendation temporarily unavailable.
        </p>
      )}

      {(status === "ready" || status === "empty") && groups.length === 0 && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          No system category strategy available yet.
        </p>
      )}

      {(status === "ready" || status === "empty") && groups.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {group.categories.map((row) => (
                  <span
                    key={`${group.id}-${row.key}`}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {formatStrategyCategoryChip(row)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StrategySkeleton() {
  return (
    <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading recommended strategy">
      {[0, 1, 2].map((index) => (
        <div key={index} className="animate-pulse">
          <div className="h-2.5 w-16 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-1.5 flex gap-1.5">
            <div className="h-5 w-12 rounded-md bg-slate-100 dark:bg-slate-800" />
            <div className="h-5 w-14 rounded-md bg-slate-100 dark:bg-slate-800" />
            <div className="h-5 w-10 rounded-md bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
