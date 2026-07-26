"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  photoUrl,
  type FantasyCategoryTargets,
  type FantasyTargetCandidate,
} from "@/lib/api";

type LeagueSlug = "ldl" | "bdb";
type Availability = "all" | "free_agent" | "rostered";
type Basis = "season" | "window";

const CATEGORY_LABELS: Record<string, string> = {
  fg_pct: "FG%", three_pm: "3PTM", ft_pct: "FT%", points: "PTS",
  rebounds: "REB", oreb: "OREB", dreb: "DREB", assists: "AST",
  steals: "ST", blocks: "BLK", turnovers: "TO", assist_turnover: "A/TO",
};

export default function CategoryNeedsFinder({
  league,
  teamId,
  initialTargets,
}: {
  league: LeagueSlug;
  teamId: string;
  initialTargets: FantasyCategoryTargets;
}) {
  const [targets, setTargets] = useState(initialTargets);
  const [basis, setBasis] = useState<Basis>("season");
  const [availability, setAvailability] = useState<Availability>("all");
  const [category, setCategory] = useState("");
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const categories = targets.league.categories ?? [];
  const positions = useMemo(() => Array.from(new Set(
    targets.candidates.flatMap((player) => player.position.split(","))
      .map((value) => value.trim()).filter(Boolean),
  )).sort(), [targets.candidates]);

  async function applyFilters(next: {
    basis?: Basis;
    availability?: Availability;
    category?: string;
    position?: string;
  }) {
    const selectedBasis = next.basis ?? basis;
    const selectedAvailability = next.availability ?? availability;
    const selectedCategory = next.category ?? category;
    const selectedPosition = next.position ?? position;
    setBasis(selectedBasis);
    setAvailability(selectedAvailability);
    setCategory(selectedCategory);
    setPosition(selectedPosition);
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({
      basis: selectedBasis,
      window: "14",
      availability: selectedAvailability,
      limit: "24",
    });
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedPosition) params.set("position", selectedPosition);
    try {
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

  return (
    <section id="player-targets" className="mt-10 scroll-mt-32">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Roster improvement</p>
          <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Players who address your needs</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Ranked against {targets.team.name}&apos;s {targets.needs.length} selected need{targets.needs.length === 1 ? "" : "s"} in {targets.league.name}&apos;s {categories.length}-category format.
              </p>
            </div>
            <div className="flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {(["season", "window"] as const).map((value) => (
                <button key={value} type="button" onClick={() => applyFilters({ basis: value })}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${basis === value ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}>
                  {value === "season" ? "Season" : "Recent 14d"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-950/40 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "free_agent", "rostered"] as const).map((value) => (
              <button key={value} type="button" onClick={() => applyFilters({ availability: value })}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${availability === value ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"}`}>
                {value === "all" ? "All" : value === "free_agent" ? "Free agents" : "Trade targets"}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <select value={category} onChange={(event) => applyFilters({ category: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">Team needs (automatic)</option>
              {categories.map((key) => <option key={key} value={key}>{CATEGORY_LABELS[key] ?? key}</option>)}
            </select>
            <select value={position} onChange={(event) => applyFilters({ position: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">All positions</option>
              {positions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wide">Optimizing for</span>
            {targets.needs.map((need) => <span key={need.key} className="rounded-full bg-rose-100 px-2.5 py-1 font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">{need.label}</span>)}
            <span>· {targets.sample.filtered_candidates} eligible players</span>
          </div>
          {targets.fallback_reason && (
            <p className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">No qualifying recent sample was available, so season performance is shown.</p>
          )}
          {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Recommendations could not be refreshed. The previous results remain visible.</p>}
          <div className={`grid gap-3 md:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
            {targets.candidates.map((player) => <CandidateCard key={`${player.availability}-${player.nba_id}`} player={player} />)}
          </div>
          {!targets.candidates.length && !loading && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No players match these filters.</p>}
        </div>
      </div>
    </section>
  );
}

function CandidateCard({ player }: { player: FantasyTargetCandidate }) {
  const photo = photoUrl(player.photo, player.nba_id);
  const injury = formatInjury(player.injury);
  return (
    <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {photo ? <Image src={photo} alt={player.name} fill className="object-cover" unoptimized /> : <span className="flex h-full items-center justify-center font-bold text-slate-400">{player.name[0]}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div><h3 className="truncate text-sm font-black text-slate-950 dark:text-white">{player.name}</h3><p className="text-xs text-slate-500">{player.nba_team_short || player.nba_team || "NBA team unavailable"} · {player.position}</p></div>
            <div className="text-right"><p className="text-lg font-black tabular-nums text-blue-700 dark:text-blue-400">{player.fit_score > 0 ? "+" : ""}{player.fit_score.toFixed(2)}</p><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Fit #{player.fit_rank}</p></div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${player.availability === "free_agent" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{player.availability === "free_agent" ? "Free agent" : player.fantasy_team?.name ?? "Rostered"}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{player.confidence} confidence</span>
      </div>
      <DetailRow label="Helps" values={player.helps} tone="positive" />
      <DetailRow label="Trade-offs" values={player.tradeoffs} tone="negative" />
      <div className="mt-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <div className="flex justify-between gap-3"><span className="text-slate-400">2026–27 salary</span><span className="font-bold text-slate-700 dark:text-slate-200">{player.salary_2026_27 ?? "$0 · Free agent"}</span></div>
        {injury && <p className="mt-2 text-rose-600 dark:text-rose-400">{injury}</p>}
      </div>
    </article>
  );
}

function formatInjury(injury: FantasyTargetCandidate["injury"]) {
  if (!injury) return null;
  if (typeof injury === "string") return injury;
  const summary = [injury.body_part, injury.status].filter(Boolean).join(" · ");
  return summary || injury.detail || null;
}

function DetailRow({ label, values, tone }: { label: string; values: string[]; tone: "positive" | "negative" }) {
  if (!values.length) return null;
  return <div className="mt-3"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1 flex flex-wrap gap-1">{values.slice(0, 4).map((value) => <span key={value} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tone === "positive" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950" : "bg-rose-50 text-rose-700 dark:bg-rose-950"}`}>{value}</span>)}</div></div>;
}
