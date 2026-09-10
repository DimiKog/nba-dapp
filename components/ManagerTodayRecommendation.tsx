"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FantasyCategoryTargets, FantasyTargetCandidate } from "@/lib/api";

type RecommendationState =
  | { status: "loading" }
  | { status: "ready"; candidate: FantasyTargetCandidate | null }
  | { status: "error" };

export default function ManagerTodayRecommendation({
  league,
  teamId,
  provisional,
}: {
  league: "ldl" | "bdb";
  teamId: string;
  provisional: boolean;
}) {
  const [state, setState] = useState<RecommendationState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const params = new URLSearchParams({
      basis: "season",
      availability: "free_agent",
      limit: "12",
    });

    fetch(
      `/api/fantasy/${league}/roster/${encodeURIComponent(teamId)}/targets?${params}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Recommendation request failed");
        return response.json() as Promise<FantasyCategoryTargets>;
      })
      .then((targets) => {
        if (active) setState({ status: "ready", candidate: selectActionableCandidate(targets) });
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setState({ status: "error" });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [league, teamId]);

  const freeAgentsHref = `/watchlist?league=${league}`;

  if (state.status === "loading") {
    return (
      <div aria-live="polite" className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Best move now</p>
        <div className="mt-3 h-4 w-40 animate-pulse rounded bg-blue-100 dark:bg-blue-900" />
        <p className="mt-2 text-xs text-slate-500">Scanning free agents for a useful fit…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Best move now</p>
        <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">Recommendations are temporarily unavailable.</p>
        <Link href={freeAgentsHref} className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Open free agents →
        </Link>
      </div>
    );
  }

  if (!state.candidate) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Best move now</p>
        <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">No clear free-agent add right now.</p>
        <p className="mt-1 text-xs text-slate-500">Last-resort options are intentionally excluded from this shortcut.</p>
        <Link href={freeAgentsHref} className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Explore the market →
        </Link>
      </div>
    );
  }

  const candidate = state.candidate;
  const playerHref = candidate.player_id
    ? `/players/${candidate.player_id}?league=${league}&from=home`
    : freeAgentsHref;
  const tierLabel = candidate.recommendation_tier === "strong" ? "Strong fit" : "Best available";

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Best move now</p>
        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">{tierLabel}</span>
        {provisional && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Provisional roster
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={playerHref} className="truncate text-base font-black text-slate-950 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
            {candidate.name}
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">{candidate.nba_team_short} · {candidate.position}</p>
        </div>
        <p className="shrink-0 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          {candidate.confidence} confidence
        </p>
      </div>
      <p className="mt-3 text-xs text-slate-700 dark:text-slate-300">
        <span className="font-bold text-emerald-700 dark:text-emerald-400">Helps:</span>{" "}
        {candidate.helps.slice(0, 4).join(" · ") || "overall roster fit"}
      </p>
      {candidate.tradeoffs.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          Trade-off: {candidate.tradeoffs.slice(0, 2).join(" · ")}
        </p>
      )}
      {provisional && (
        <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-300">
          Recheck after the roster reaches its configured minimum; the recommendation may change.
        </p>
      )}
    </div>
  );
}

function selectActionableCandidate(targets: FantasyCategoryTargets): FantasyTargetCandidate | null {
  const direct = targets.candidates.find((candidate) => candidate.recommendation_tier === "strong")
    ?? targets.candidates.find((candidate) => candidate.recommendation_tier === "best_available");
  if (direct) return direct;

  for (const recommendation of targets.category_recommendations ?? []) {
    if (recommendation.strong_free_agents.length > 0) {
      return { ...recommendation.strong_free_agents[0], recommendation_tier: "strong" };
    }
  }
  for (const recommendation of targets.category_recommendations ?? []) {
    if (recommendation.best_available.length > 0) {
      return { ...recommendation.best_available[0], recommendation_tier: "best_available" };
    }
  }
  return null;
}
