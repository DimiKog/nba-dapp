"use client";

import { useState } from "react";
import { ApiResponseError, fetchRosterMoveAnalysis } from "@/lib/api";
import type { RosterMoveAnalysis, RosterMoveRecommendation } from "@/lib/rosterMoveTypes";
import {
  acquisitionReasonLabel,
  categoryShortLabel,
  formatMoneyDelta,
  hasProtectDamage,
  headlineStatus,
  observedGamesLabel,
  protectDamageLabel,
  salaryDeltaLabel,
  targetImprovementLines,
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
  const targets = targetImprovementLines(move);
  const protectLine = protectDamageLabel(move);
  const protectDamaged = hasProtectDamage(move);
  const gamesLine = observedGamesLabel(move);
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
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-base font-black text-slate-950 dark:text-white">
        Add {addName}
        <span className="mx-1.5 font-bold text-slate-400">→</span>
        Drop {dropName}
      </h3>

      {targets.length > 0 ? (
        <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          {targets.join(" · ")}
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No TARGET category rank gains listed</p>
      )}

      <p className={`mt-1 text-sm font-semibold ${protectDamaged ? "text-rose-700 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"}`}>
        {protectLine}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {statusLine}
        </span>
        {gamesLine && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {gamesLine}
          </span>
        )}
        {salaryLine && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {salaryLine}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => void toggleAnalysis()}
        className="mt-3 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300"
        aria-expanded={open}
      >
        {open ? "Hide analysis" : "View analysis"}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
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
                {typeof row.rank_delta === "number" ? ` (${row.rank_delta > 0 ? "+" : ""}${row.rank_delta})` : ""}
                {typeof row.z_delta === "number" ? ` · ${row.z_delta > 0 ? "+" : ""}${row.z_delta.toFixed(2)}z` : ""}
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
