"use client";

import { useState } from "react";
import type { FantasyCategoryTargets } from "@/lib/api";
import CategoryNeedsFinder from "@/components/CategoryNeedsFinder";

type LeagueSlug = "ldl" | "bdb";

export default function CategoryNeedsSection({
  league,
  teamId,
  teamName,
  initialTargets,
  isPersonalTeam,
}: {
  league: LeagueSlug;
  teamId: string;
  teamName: string;
  initialTargets: FantasyCategoryTargets | null;
  isPersonalTeam: boolean;
}) {
  const [targets, setTargets] = useState(initialTargets);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function loadTargets() {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        basis: "season",
        window: "14",
        availability: "all",
        limit: "24",
      });
      const response = await fetch(
        `/api/fantasy/${league}/roster/${encodeURIComponent(teamId)}/targets?${params}`,
      );
      if (!response.ok) throw new Error();
      setTargets(await response.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (targets) {
    return (
      <CategoryNeedsFinder
        league={league}
        teamId={teamId}
        initialTargets={targets}
      />
    );
  }

  return (
    <section id="player-targets" className="mt-10 scroll-mt-32">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          Roster improvement
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
          Analyze targets for {teamName}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          {isPersonalTeam
            ? "Recommendations could not be loaded automatically. Try the analysis again."
            : "Target recommendations for other teams are generated only when requested, keeping the page faster and lighter."}
        </p>
        <button
          type="button"
          onClick={loadTargets}
          disabled={loading}
          className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Analyzing roster…" : "Analyze player targets"}
        </button>
        {error && (
          <p className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">
            The analysis could not be loaded. Please try again.
          </p>
        )}
      </div>
    </section>
  );
}
