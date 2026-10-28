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
  embedded = false,
}: {
  league: "ldl" | "bdb";
  teamId: string;
  /** When true, omit the outer Team Intelligence chrome (parent area owns it). */
  embedded?: boolean;
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

  const heading = (
      <div className={embedded ? "mb-4 mt-3" : "mb-4"}>
        {!embedded && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
            Team intelligence
          </p>
        )}
        <h2 className={`${embedded ? "" : "mt-1 "}text-xl font-black text-slate-950 dark:text-white`}>
          Recommended moves
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Moves that strengthen your recommended category plan.
        </p>
      </div>
  );

  const body = (
    <>
      {heading}

      {state === "loading" && <RecommendedMovesSkeleton />}

      {state === "error" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error ?? "Could not load recommended moves."}
        </div>
      )}

      {state === "empty" && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No recommended roster moves right now. Check back after the next roster
          or stats refresh.
        </div>
      )}

      {state === "ready" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:items-stretch">
            {visible.map((move) => (
              <RecommendedMoveCard
                key={`${move.remove_player?.nba_id}-${move.add_player?.nba_id}-${move.tier}`}
                league={league}
                teamId={teamId}
                move={move}
              />
            ))}
          </div>
          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-900 sm:w-auto"
            >
              Explore more moves
            </button>
          )}
          {expanded && moves.length > INITIAL_RECOMMENDATION_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Show fewer moves
            </button>
          )}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div id="recommended-moves" className="scroll-mt-32">
        {body}
      </div>
    );
  }

  return (
    <section
      id="recommended-moves"
      className="mt-10 scroll-mt-32 rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20 sm:p-5"
    >
      {body}
    </section>
  );
}

function RecommendedMovesSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading recommended moves"
    >
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/80"
        >
          <div className="h-4 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 flex gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1">
              <div className="h-3 w-10 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="mt-2 h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-3 h-3 w-10 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="mt-1 h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
