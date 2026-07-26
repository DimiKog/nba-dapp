"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  photoUrl,
  type FantasyCategoryRecommendation,
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
  const [focusedLane, setFocusedLane] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestSequence = useRef(0);

  const categories = targets.league.categories ?? [];
  const recommendationLanes = targets.category_recommendations ?? [];
  const activeLane = recommendationLanes.find((lane) => lane.key === focusedLane)
    ?? recommendationLanes[0];
  const positions = useMemo(() => Array.from(new Set(
    targets.candidates.flatMap((player) => player.position.split(","))
      .map((value) => value.trim()).filter(Boolean),
  )).sort(), [targets.candidates]);
  const filtersAreDefault = basis === "season"
    && availability === "all"
    && category === ""
    && position === "";

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
    const requestId = ++requestSequence.current;
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
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error();
      const nextTargets = await response.json();
      if (requestId !== requestSequence.current) return;
      setTargets(nextTargets);
      setFocusedLane("");
    } catch {
      if (requestId === requestSequence.current) setError(true);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }

  function resetFilters() {
    setFocusedLane("");
    void applyFilters({
      basis: "season",
      availability: "all",
      category: "",
      position: "",
    });
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
            <button
              type="button"
              onClick={resetFilters}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-300"
            >
              {loading ? "Refreshing…" : filtersAreDefault ? "Refresh defaults" : "Reset filters"}
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wide">Optimizing for</span>
            {targets.needs.map((need) => <span key={need.key} className="rounded-full bg-rose-100 px-2.5 py-1 font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">{need.label}</span>)}
            <span>· {targets.sample.filtered_candidates} eligible players</span>
          </div>
          <details className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
            <summary className="cursor-pointer font-bold text-blue-700 marker:text-slate-400 dark:text-blue-400">
              How are recommendations scored?
            </summary>
            <div className="mt-3 grid gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
              <p><strong className="text-slate-900 dark:text-white">Category impact:</strong> 0 z is average among eligible players. Positive values are better and negative values are worse.</p>
              <p><strong className="text-slate-900 dark:text-white">Strong help:</strong> +0.50 z or higher is treated as a meaningful category improvement.</p>
              <p><strong className="text-slate-900 dark:text-white">Market rank:</strong> free agents and rostered trade targets are ranked separately from their absolute z-score.</p>
              <p><strong className="text-slate-900 dark:text-white">FG% and FT%:</strong> shooting impact accounts for attempt volume, not percentage alone.</p>
              <p><strong className="text-slate-900 dark:text-white">Turnovers:</strong> lower is better, so fewer turnovers produce a more positive score.</p>
              <p><strong className="text-slate-900 dark:text-white">Overall fit:</strong> combines category scores and gives more weight to your team&apos;s deeper weaknesses.</p>
            </div>
          </details>
          {targets.fallback_reason && (
            <p className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">No qualifying recent sample was available, so season performance is shown.</p>
          )}
          {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Recommendations could not be refreshed. The previous results remain visible.</p>}
          {loading && !activeLane ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 p-8 text-center text-sm font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">Refreshing recommendations…</p>
          ) : activeLane ? (
            <div className={loading ? "opacity-50" : ""} aria-busy={loading}>
              <div className="mb-4 flex flex-wrap gap-2" aria-label="Recommendation categories">
                {recommendationLanes.map((lane) => (
                  <button
                    key={lane.key}
                    type="button"
                    onClick={() => setFocusedLane(lane.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeLane.key === lane.key ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}
                  >
                    {lane.label}
                  </button>
                ))}
              </div>
              <RecommendationLane lane={activeLane} />
            </div>
          ) : !error ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No category recommendations are available for these filters.</p>
          ) : null}

          <details className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-black text-blue-700 marker:text-slate-400 dark:text-blue-400">
              Explore all {targets.candidates.length} eligible candidates
            </summary>
            <p className="mt-2 text-xs text-slate-500">The complete overall fit ranking is preserved for deeper research and comparison.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {targets.candidates.map((player) => <CandidateCard key={`${player.availability}-${player.nba_id}`} player={player} />)}
            </div>
            {!targets.candidates.length && !loading && <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No players match these filters.</p>}
          </details>
        </div>
      </div>
    </section>
  );
}

const MARKET_PRESENTATION = {
  strong: {
    label: "Strong FA options",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    description: "At least one available player provides a meaningful improvement without damaging another selected need.",
  },
  limited: {
    label: "Limited FA market",
    className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    description: "The best available players rank well in this market, but are not strong improvements in absolute terms.",
  },
  weak: {
    label: "Weak FA market",
    className: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
    description: "Available options carry meaningful drawbacks. Trade targets deserve more attention.",
  },
  no_qualifying_options: {
    label: "No qualifying FA options",
    className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
    description: "No available player clears the minimum recommendation threshold. Consider the trade market.",
  },
} as const;

function RecommendationLane({ lane }: { lane: FantasyCategoryRecommendation }) {
  const market = MARKET_PRESENTATION[lane.free_agent_market];
  return (
    <div>
      <div className={`rounded-xl border p-4 ${market.className}`}>
        <p className="text-xs font-black uppercase tracking-[0.14em]">{lane.label} market verdict</p>
        <h3 className="mt-1 text-lg font-black">{market.label}</h3>
        <p className="mt-1 text-sm opacity-90">{lane.message ?? market.description}</p>
      </div>

      <RecommendationGroup title="Strong free agents" description="Clear additions for this category with controlled downside." players={lane.strong_free_agents} categoryKey={lane.key} categoryLabel={lane.label} />
      <RecommendationGroup title="Best available" description="Relative market leaders, although their absolute improvement is modest." players={lane.best_available} categoryKey={lane.key} categoryLabel={lane.label} />
      <RecommendationGroup title="Trade targets" description="Rostered players worth exploring when free agency cannot provide enough help." players={lane.trade_targets} categoryKey={lane.key} categoryLabel={lane.label} tone="trade" />
      {lane.last_resort.length > 0 && (
        <RecommendationGroup title="Last resort" description="Use only if stronger options are unavailable; these players come with important drawbacks." players={lane.last_resort} categoryKey={lane.key} categoryLabel={lane.label} tone="muted" />
      )}
    </div>
  );
}

function RecommendationGroup({
  title,
  description,
  players,
  categoryKey,
  categoryLabel,
  tone = "default",
}: {
  title: string;
  description: string;
  players: FantasyTargetCandidate[];
  categoryKey: string;
  categoryLabel: string;
  tone?: "default" | "trade" | "muted";
}) {
  if (!players.length) return null;
  return (
    <section className={`mt-5 ${tone === "muted" ? "opacity-75" : ""}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${tone === "trade" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>{players.length} option{players.length === 1 ? "" : "s"}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {players.map((player) => <CandidateCard key={`${title}-${player.availability}-${player.nba_id}`} player={player} categoryKey={categoryKey} categoryLabel={categoryLabel} />)}
      </div>
    </section>
  );
}

function CandidateCard({
  player,
  categoryKey,
  categoryLabel,
}: {
  player: FantasyTargetCandidate;
  categoryKey?: string;
  categoryLabel?: string;
}) {
  const photo = photoUrl(player.photo, player.nba_id);
  const injury = formatInjury(player.injury);
  const categoryContribution = categoryKey
    ? player.need_contributions?.find((item) => item.key === categoryKey)
    : undefined;
  const categoryZ = categoryContribution?.absolute_z ?? categoryContribution?.player_z;
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
        {player.availability_rank && player.availability_of && (
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">Market #{player.availability_rank} of {player.availability_of}</span>
        )}
      </div>
      {categoryLabel && typeof categoryZ === "number" && (
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
          <span className="font-black">{categoryLabel} impact: {categoryZ > 0 ? "+" : ""}{categoryZ.toFixed(2)} z</span>
          {player.availability_rank && player.availability_of && (
            <span className="ml-1 text-blue-600 dark:text-blue-400">· market #{player.availability_rank} of {player.availability_of}</span>
          )}
        </div>
      )}
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
