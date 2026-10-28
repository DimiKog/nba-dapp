"use client";

import Image from "next/image";
import { useState } from "react";
import { ApiResponseError, fetchRosterMoveAnalysis, photoUrl } from "@/lib/api";
import type { RosterMoveAnalysis, RosterMoveRecommendation } from "@/lib/rosterMoveTypes";
import {
  acquisitionReasonLabel,
  categoryShortLabel,
  compactObservedGames,
  formatMoneyDelta,
  hasProtectDamage,
  headlineStatus,
  protectDamageLabel,
  salaryDeltaLabel,
  targetImpactDisplays,
} from "@/lib/rosterMovePresentation";

export default function RecommendedMoveCard({
  league,
  teamId,
  move,
}: {
  league: "ldl" | "bdb";
  teamId: string;
  move: RosterMoveRecommendation;
}) {
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState<RosterMoveAnalysis | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const addName = move.add_player?.name ?? "Free agent";
  const dropName = move.remove_player?.name ?? "Roster player";
  const addPhoto = photoUrl(
    typeof move.add_player?.photo === "string" ? move.add_player.photo : null,
    move.add_player?.nba_id,
  );
  const targets = targetImpactDisplays(move);
  const protectLine = protectDamageLabel(move);
  const protectDamaged = hasProtectDamage(move);
  const gamesCue = compactObservedGames(move);
  const salaryLine = salaryDeltaLabel(move);
  const statusLine = headlineStatus(move);

  async function toggleAnalysis() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (analysis || status === "loading") return;
    setStatus("loading");
    setError(null);
    try {
      const result = await fetchRosterMoveAnalysis(league, teamId, {
        remove_nba_id: Number(move.remove_player.nba_id),
        add_nba_id: Number(move.add_player.nba_id),
        basis: "season",
      });
      setAnalysis(result);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ApiResponseError
          ? err.message
          : "Could not load move analysis",
      );
    }
  }

  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/80">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {statusLine}
        </span>
        {gamesCue && (
          <span className="text-[11px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
            {gamesCue}
          </span>
        )}
      </div>

      <div className="mt-3 flex min-w-0 items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          {addPhoto ? (
            <Image src={addPhoto} alt={addName} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-400">
              {addName[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
            Add
          </p>
          <h3 className="mt-0.5 truncate text-lg font-black leading-tight text-slate-950 dark:text-white">
            {addName}
          </h3>
          <div className="mt-2 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Drop
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
              {dropName}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Helps your targets
        </p>
        {targets.length > 0 ? (
          <ul className="mt-1.5 space-y-1.5">
            {targets.map((row) => (
              <li
                key={row.key}
                className={`rounded-md px-2 py-1.5 ${
                  row.improved
                    ? "bg-emerald-50 dark:bg-emerald-950/40"
                    : "bg-rose-50 dark:bg-rose-950/30"
                }`}
              >
                {row.beforeRank != null && row.afterRank != null ? (
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className={`text-[11px] font-black ${row.improved ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}>
                      {row.label}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      #{row.beforeRank} → #{row.afterRank}
                    </span>
                    {row.places != null && row.places > 0 && (
                      <span className={`w-full text-[10px] font-semibold ${row.improved ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                        {row.improved ? "+" : "−"}
                        {row.places} {row.places === 1 ? "place" : "places"}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className={`text-[11px] font-bold ${row.improved ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}>
                    {row.fallbackLine}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400">No TARGET gains listed</p>
        )}
      </div>

      <p
        className={`mt-3 text-xs font-semibold ${
          protectDamaged
            ? "text-rose-700 dark:text-rose-300"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {protectDamaged ? protectLine : `✓ ${protectLine}`}
      </p>

      {salaryLine && (
        <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {salaryLine}
        </p>
      )}

      <button
        type="button"
        onClick={() => void toggleAnalysis()}
        className="mt-3 self-start text-sm font-bold text-blue-700 hover:underline dark:text-blue-300"
        aria-expanded={open}
      >
        {open ? "Hide analysis" : "View analysis →"}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/80">
          {status === "loading" && (
            <p className="text-sm text-slate-500">Loading analysis…</p>
          )}
          {status === "error" && (
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          )}
          {status === "ready" && analysis && (
            <MoveAnalysisDetail analysis={analysis} />
          )}
        </div>
      )}
    </article>
  );
}

function humanizeBasis(resolution: string): string {
  if (resolution === "early_season_linear_blend_v1" || resolution === "blended") {
    return "early-season blend";
  }
  if (resolution === "previous_only") return "previous season only";
  if (resolution === "current_only") return "current season only";
  if (resolution === "insufficient") return "insufficient sample";
  return resolution.replaceAll("_", " ");
}

function MoveAnalysisDetail({ analysis }: { analysis: RosterMoveAnalysis }) {
  const impacts = (analysis.category_impact ?? []).filter(
    (row) => row.transition && row.transition !== "unchanged",
  );
  const strategic = analysis.strategic_impact;
  const protectDamaged = strategic?.protect?.damaged ?? [];
  const targetImproved = strategic?.target?.improved ?? [];
  const salary = analysis.salary_cap as {
    applies?: boolean;
    delta?: number | null;
    current_season?: { delta?: number | null; cap_result?: string | null };
  } | null;
  const salaryDelta =
    typeof salary?.delta === "number"
      ? salary.delta
      : typeof salary?.current_season?.delta === "number"
        ? salary.current_season.delta
        : null;
  const actionability = analysis.actionability?.added;
  const addPlayer = analysis.move?.added?.[0];
  const removePlayer = analysis.move?.removed?.[0];

  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold text-slate-800 dark:text-slate-100">
        {addPlayer?.name ?? "Add"} replaces {removePlayer?.name ?? "drop"}
      </p>

      {(targetImproved.length > 0 || protectDamaged.length > 0) && (
        <div className="space-y-1 text-xs">
          {targetImproved.length > 0 && (
            <p className="text-emerald-800 dark:text-emerald-300">
              TARGET improved: {targetImproved.map(categoryShortLabel).join(", ")}
            </p>
          )}
          <p className={protectDamaged.length ? "text-rose-700 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"}>
            {protectDamaged.length
              ? `PROTECT damaged: ${protectDamaged.map(categoryShortLabel).join(", ")}`
              : "No PROTECT categories damaged"}
          </p>
        </div>
      )}

      {impacts.length > 0 ? (
        <ul className="space-y-1.5">
          {impacts.map((row) => (
            <li
              key={row.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs text-slate-700 dark:text-slate-300"
            >
              <span>
                <span className="font-bold">{row.label ?? categoryShortLabel(row.key)}</span>
                {row.classification ? ` · ${row.classification}` : ""}
                {row.transition ? ` · ${row.transition}` : ""}
              </span>
              <span className="tabular-nums text-slate-500">
                #{row.before?.league_rank ?? "—"} → #{row.after?.league_rank ?? "—"}
                {typeof row.rank_delta === "number" && row.rank_delta !== 0
                  ? ` · ${row.rank_delta > 0 ? "+" : "−"}${Math.abs(row.rank_delta)} ${Math.abs(row.rank_delta) === 1 ? "place" : "places"}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">No meaningful category transitions.</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        {typeof addPlayer?.observed?.games === "number" && (
          <span>{addPlayer.observed.games} current-season GP</span>
        )}
        {addPlayer?.contribution_basis?.resolution && (
          <span>
            Basis: {humanizeBasis(String(addPlayer.contribution_basis.resolution))}
          </span>
        )}
        {salary?.applies && salaryDelta != null && (
          <span>Salary {formatMoneyDelta(salaryDelta)}</span>
        )}
      </div>

      {(actionability?.reasons?.length ?? 0) > 0 && (
        <p className="text-xs text-slate-500">
          Review: {(actionability?.reasons ?? []).map(acquisitionReasonLabel).join(" · ")}
        </p>
      )}
    </div>
  );
}
