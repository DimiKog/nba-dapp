"use client";

import { useEffect, useState } from "react";
import { ApiResponseError, fetchRosterMoveDiscovery } from "@/lib/api";
import type { RosterMoveDiscovery, RosterMoveRecommendation } from "@/lib/rosterMoveTypes";
import {
  flattenDiscoveryRecommendations,
  INITIAL_RECOMMENDATION_COUNT,
  visibleRecommendations,
} from "@/lib/rosterMovePresentation";
import RecommendedMoveCard from "@/components/RecommendedMoveCard";

type LoadState = "loading" | "ready" | "empty" | "error";

export default function RecommendedMovesSection({
  league,
  teamId,
}: {
  league: "ldl" | "bdb";
  teamId: string;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [moves, setMoves] = useState<RosterMoveRecommendation[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRosterMoveDiscovery(league, teamId, { basis: "season" })
      .then((discovery: RosterMoveDiscovery) => {
        if (!active) return;
        const flattened = flattenDiscoveryRecommendations(discovery);
        setMoves(flattened);
        setExpanded(false);
        setError(null);
        setState(flattened.length ? "ready" : "empty");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setState("error");
        setError(
          err instanceof ApiResponseError
            ? err.message
            : "Could not load recommended moves",
        );
      });
    return () => {
      active = false;
    };
  }, [league, teamId]);

  const visible = visibleRecommendations(moves, expanded);
  const hiddenCount = Math.max(0, moves.length - INITIAL_RECOMMENDATION_COUNT);

  return (
    <section id="recommended-moves" className="mt-10 scroll-mt-32">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          Team intelligence
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
          Recommended moves
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Unilateral free-agent add / roster drop ideas for your team. Not trade
          suggestions, matchup projections, or guaranteed wins.
        </p>
      </div>

      {state === "loading" && <RecommendedMovesSkeleton />}

      {state === "error" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error ?? "Could not load recommended moves."}
        </div>
      )}

      {state === "empty" && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No recommended roster moves right now. Check back after the next roster
          or stats refresh.
        </div>
      )}

      {state === "ready" && (
        <div className="space-y-3">
          {visible.map((move) => (
            <RecommendedMoveCard
              key={`${move.remove_player?.nba_id}-${move.add_player?.nba_id}-${move.tier}`}
              league={league}
              teamId={teamId}
              move={move}
            />
          ))}
          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
            >
              View all recommendations ({moves.length})
            </button>
          )}
          {expanded && moves.length > INITIAL_RECOMMENDATION_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Show top {INITIAL_RECOMMENDATION_COUNT}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function RecommendedMovesSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading recommended moves">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2 h-4 w-2/5 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-4 h-6 w-40 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
