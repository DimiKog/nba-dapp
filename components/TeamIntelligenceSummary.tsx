import type { FantasyTeamCategoryProfile } from "@/lib/api";
import type { RosterMoveRecommendedStrategy } from "@/lib/rosterMoveTypes";
import {
  formatLookItems,
  selectNeedsAttentionCategories,
  selectPuntCandidateCategories,
  selectStrongestCategories,
} from "@/lib/teamIntelligencePresentation";

type DiscoveryStatus = "idle" | "loading" | "ready" | "empty" | "error";

/**
 * Compact "How your team looks" strip from the SSR category profile.
 * Punt candidates populate only after system recommended_strategy loads.
 */
export default function TeamIntelligenceSummary({
  profile,
  strategy,
  discoveryStatus = "idle",
}: {
  profile: FantasyTeamCategoryProfile;
  strategy?: RosterMoveRecommendedStrategy | null;
  discoveryStatus?: DiscoveryStatus;
}) {
  const strongest = selectStrongestCategories(profile);
  const needsAttention = selectNeedsAttentionCategories(profile);
  const puntCandidates = selectPuntCandidateCategories(strategy);
  const showPuntRow = discoveryStatus !== "idle";

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/80 sm:p-4">
      <h3 className="text-sm font-black text-slate-950 dark:text-white">
        How your team looks
      </h3>
      <dl className="mt-3 space-y-2">
        <LookRow
          label="Strongest"
          value={strongest.length ? formatLookItems(strongest) : "No clear strengths yet"}
          tone={strongest.length ? "strength" : "muted"}
        />
        <LookRow
          label="Needs attention"
          value={needsAttention.length ? formatLookItems(needsAttention) : "No clear weaknesses yet"}
          tone={needsAttention.length ? "weakness" : "muted"}
        />
        {showPuntRow && (
          discoveryStatus === "loading" ? (
            <LookRow label="Punt candidate" value="Loading…" tone="muted" />
          ) : discoveryStatus === "error" ? (
            <LookRow label="Punt candidate" value="Unavailable" tone="muted" />
          ) : puntCandidates.length > 0 ? (
            <LookRow
              label="Punt candidate"
              value={formatLookItems(puntCandidates)}
              tone="punt"
            />
          ) : null
        )}
      </dl>
    </div>
  );
}

function LookRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "strength" | "weakness" | "punt" | "muted";
}) {
  const valueClass =
    tone === "strength"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "weakness"
        ? "text-rose-700 dark:text-rose-300"
        : tone === "punt"
          ? "text-amber-800 dark:text-amber-200"
          : "text-slate-500 dark:text-slate-400";

  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-2 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className={`truncate text-sm font-bold tabular-nums ${valueClass}`}>
        {value}
      </dd>
    </div>
  );
}
