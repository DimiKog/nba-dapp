"use client";

import { useEffect, useState } from "react";
import { fetchFantasyPeriodCategoryBaseline } from "@/lib/api";
import type {
  FantasyTeamCategory,
  FantasyTeamCategoryProfile,
  FantasySeasonCategoryActuals,
  FantasyPeriodCategoryBaseline,
} from "@/lib/api";

type ProfileView = "season" | "window";
type CategoryTab = "performance" | "fantrax" | "potential";

const VERDICT_STYLES = {
  strength: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    label: "Strength",
  },
  neutral: {
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    label: "Neutral",
  },
  weakness: {
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    label: "Weakness",
  },
  insufficient_data: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    label: "Limited data",
  },
} as const;

export default function TeamCategoryProfilePanel({
  seasonProfile,
  windowProfile,
  seasonActuals,
  league,
  teamId,
  presentation = "primary",
}: {
  seasonProfile: FantasyTeamCategoryProfile;
  windowProfile: FantasyTeamCategoryProfile | null;
  seasonActuals: FantasySeasonCategoryActuals | null;
  league: "ldl" | "bdb" | "gnfc";
  teamId: string;
  /** Secondary: demoted under Team Intelligence (no competing eyebrow). */
  presentation?: "primary" | "secondary";
}) {
  const [activeTab, setActiveTab] = useState<CategoryTab>("performance");
  const [view, setView] = useState<ProfileView>("season");
  const [periodBaseline, setPeriodBaseline] = useState<FantasyPeriodCategoryBaseline | null>(null);
  const [baselineStatus, setBaselineStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  useEffect(() => {
    let current = true;
    fetchFantasyPeriodCategoryBaseline(league, teamId)
      .then((result) => {
        if (current) {
          setPeriodBaseline(result);
          setBaselineStatus("ready");
        }
      })
      .catch(() => {
        if (current) setBaselineStatus("unavailable");
      });
    return () => { current = false; };
  }, [league, teamId]);
  const selected = view === "window" && windowProfile ? windowProfile : seasonProfile;
  const windowFallback =
    view === "window" &&
    selected.basis_requested === "window" &&
    selected.basis_used === "season";

  const secondary = presentation === "secondary";

  return (
    <section
      id="team-analysis"
      className={secondary ? "scroll-mt-32" : "mt-10 scroll-mt-32"}
    >
      <div className={`overflow-hidden bg-white dark:bg-slate-900 ${secondary ? "" : "rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700"}`}>
        <div className={`flex flex-col gap-4 border-b border-slate-200 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between ${secondary ? "px-4 py-4" : "px-5 py-5"}`}>
          <div>
            {!secondary && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                Team intelligence
              </p>
            )}
            <h2 className={`${secondary ? "text-lg" : "mt-1 text-xl"} font-black text-slate-950 dark:text-white`}>
              Category profile
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              The completed-period comparison measures the same active player-games. Fantrax YTD rank and current-roster potential remain separate views.
            </p>
          </div>
        </div>

        <div role="group" aria-label="Category analysis views" className="grid grid-cols-3 gap-1 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/40 sm:flex sm:gap-2 sm:px-5">
          <CategoryTabButton id="performance" activeTab={activeTab} onClick={setActiveTab}>Performance</CategoryTabButton>
          <CategoryTabButton id="fantrax" activeTab={activeTab} onClick={setActiveTab}>Fantrax rank</CategoryTabButton>
          <CategoryTabButton id="potential" activeTab={activeTab} onClick={setActiveTab}>Roster potential</CategoryTabButton>
        </div>

        {activeTab === "performance" && (
          <div id="category-panel-performance" aria-labelledby="category-tab-performance">
            <PeriodBaselinePanel baseline={periodBaseline} status={baselineStatus} categories={seasonProfile.categories} />
          </div>
        )}

        {activeTab === "fantrax" && (
          <div id="category-panel-fantrax" aria-labelledby="category-tab-fantrax">
            <div role="status" className={`px-5 py-4 text-sm ${seasonActuals?.stale ? "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" : "bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200"}`}>
              <p className="font-bold">Actual season results · Fantrax Season Stats</p>
              <p className="mt-1 text-xs leading-relaxed">
                {seasonActuals
                  ? `${seasonActuals.stale ? "Last verified snapshot" : "Year to date"} · ${seasonActuals.league_teams} teams · fetched ${formatFetchedAt(seasonActuals.fetched_at)}${seasonActuals.stale ? " · Fantrax is temporarily unavailable" : ""}`
                  : "Temporarily unavailable; no actual rank is inferred."}
              </p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {seasonProfile.categories.map((category) => (
                <ActualCategoryCard
                  key={category.key}
                  category={category}
                  actual={seasonActuals?.team.categories[category.key] ?? null}
                  actualTeams={seasonActuals?.league_teams ?? null}
                />
              ))}
            </div>
            <p className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
              Fantrax Year to Date counts only results that have been credited. These totals and ranks are not directly comparable with the current-roster potential.
            </p>
          </div>
        )}

        {activeTab === "potential" && (
          <div id="category-panel-potential" aria-labelledby="category-tab-potential">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-slate-500">Current full roster, including Reserve and IR. This is a relative profile, not a forecast.</p>
              <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <ViewButton active={view === "season"} onClick={() => setView("season")}>Season</ViewButton>
                <ViewButton active={view === "window"} disabled={!windowProfile} onClick={() => setView("window")}>Recent 14d</ViewButton>
              </div>
            </div>
            {windowFallback && (
              <div className="border-y border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
                No qualifying games were found in the last 14 days. Season production is shown instead.
              </div>
            )}
            <div className="grid gap-4 border-y border-slate-200 px-5 py-4 dark:border-slate-700 md:grid-cols-2">
              <ProfileSummary title="Roster potential strengths" values={selected.strengths} empty="No top-third categories" tone="strength" />
              <ProfileSummary title="Roster potential weaknesses" values={selected.weaknesses} empty="No bottom-third categories" tone="weakness" />
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {selected.categories.map((category) => (
                <PotentialCategoryCard key={category.key} category={category} potentialBasis={selected.basis_used} windowDays={selected.window.days} />
              ))}
            </div>
            <p className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
              <span className="font-bold text-slate-700 dark:text-slate-300">{selected.sample.players_included} players included</span>
              {selected.sample.players_missing_stats > 0 && <> · {selected.sample.players_missing_stats} without qualifying stats</>}
              {" · "}FG% and FT% are attempt-weighted; lower turnovers rank better.
              {selected.basis_used === "window" && <> Recent figures use all currently owned players, not historical active lineups.</>}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function PeriodBaselinePanel({
  baseline,
  status,
  categories,
}: {
  baseline: FantasyPeriodCategoryBaseline | null;
  status: "loading" | "ready" | "unavailable";
  categories: FantasyTeamCategory[];
}) {
  if (!baseline) {
    return (
      <div className="border-b border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-700">
        {status === "loading" ? "Loading completed-period comparison…" : status === "unavailable" ? "Completed-period comparison is temporarily unavailable; no performance gap is inferred." : "Same-opportunity comparison awaits a verified completed scoring period."}
      </div>
    );
  }
  const complete = baseline.covered_player_games === baseline.actual_player_games;
  return (
    <div className="border-b border-slate-200 bg-violet-50/50 px-5 py-5 dark:border-slate-700 dark:bg-violet-950/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Actual vs pre-period baseline</p>
          <h3 className="mt-1 text-base font-black text-slate-950 dark:text-white">Scoring period {baseline.scoring_period} · {formatShortDate(baseline.period_start)}–{formatShortDate(baseline.period_end)}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            The actual and baseline use the same active player-games. Counting stats are shown per player-game; shooting percentages use total makes and attempts. Positive difference means better than baseline, including fewer turnovers.
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${complete ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"}`}>
          Baseline coverage {baseline.covered_player_games}/{baseline.actual_player_games} games
        </span>
      </div>
      {!complete && (
        <p className="mt-3 text-xs font-semibold text-amber-800 dark:text-amber-300">
          Partial comparison: {baseline.missing_baseline_players} player{baseline.missing_baseline_players === 1 ? "" : "s"} lack a reliable pre-period baseline. Their games are excluded from both sides below.
        </p>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const comparison = baseline.categories[category.key];
          const difference = comparison?.favorable_delta;
          return (
            <div key={category.key} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-[11px] font-black uppercase text-slate-500">{category.label}</p>
              {comparison?.actual == null || comparison.baseline == null ? (
                <p className="mt-1 text-xs text-slate-500">Insufficient baseline</p>
              ) : (
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                  <span className="font-black tabular-nums text-slate-950 dark:text-white">{formatPeriodValue(comparison.actual, category.key)}</span>
                  <span className="text-slate-400">vs</span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-300">{formatPeriodValue(comparison.baseline, category.key)}</span>
                  <span className={`ml-auto font-black tabular-nums ${difference != null && difference > 0 ? "text-emerald-700 dark:text-emerald-300" : difference != null && difference < 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-500"}`}>
                    {difference == null ? "—" : `${difference > 0 ? "+" : ""}${formatPeriodValue(difference, category.key)}`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Baseline starts with {baseline.previous_season} NBA per-game stats. Pre-period games from {baseline.season} gradually take more weight (50% after 10 games; 75% after 30). This measures past performance against a reference, not future role or final standing.
      </p>
    </div>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "America/New_York" }).format(new Date(value));
}

function formatPeriodValue(value: number, key: string) {
  if (key === "fg_pct" || key === "ft_pct") return `${value.toFixed(1)}%`;
  return value.toFixed(2);
}

function CategoryTabButton({
  id,
  activeTab,
  onClick,
  children,
}: {
  id: CategoryTab;
  activeTab: CategoryTab;
  onClick: (tab: CategoryTab) => void;
  children: React.ReactNode;
}) {
  const active = activeTab === id;
  return (
    <button
      id={`category-tab-${id}`}
      type="button"
      aria-pressed={active}
      onClick={() => onClick(id)}
      className={`min-w-0 rounded-lg px-2 py-2 text-center text-xs font-bold transition sm:px-4 ${active ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300" : "text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"}`}
    >
      {children}
    </button>
  );
}

function ViewButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
        active
          ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
          : "text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ProfileSummary({
  title,
  values,
  empty,
  tone,
}: {
  title: string;
  values: string[];
  empty: string;
  tone: "strength" | "weakness";
}) {
  const chip =
    tone === "strength"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
      : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300";
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length ? (
          values.map((value) => (
            <span key={value} className={`rounded-full px-2.5 py-1 text-xs font-bold ${chip}`}>
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">{empty}</span>
        )}
      </div>
    </div>
  );
}

function ActualCategoryCard({
  category,
  actual,
  actualTeams,
}: {
  category: FantasyTeamCategory;
  actual: { rank: number; value: number } | null;
  actualTeams: number | null;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{category.label}</p>
      {actual && actualTeams ? (
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-2xl font-black tabular-nums text-slate-950 dark:text-white">{formatActualValue(actual.value, category.key)}</p>
          <p className="text-sm font-black tabular-nums text-blue-800 dark:text-blue-200">#{formatRank(actual.rank)} of {actualTeams}</p>
        </div>
      ) : <p className="mt-3 text-sm font-semibold text-slate-500">Unavailable</p>}
    </article>
  );
}

function PotentialCategoryCard({
  category,
  potentialBasis,
  windowDays,
}: {
  category: FantasyTeamCategory;
  potentialBasis: "season" | "window";
  windowDays: number;
}) {
  const style = VERDICT_STYLES[category.verdict];
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{category.label}</p>
      <div className="mt-3">
        <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase ${style.badge}`}>{style.label}</span>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatCategoryValue(category)}</p>
          <p className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
            {category.league_rank == null
              ? "—"
              : `#${formatRank(category.league_rank)} of ${category.eligible_teams}`}
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {potentialScopeLabel(category.key, potentialBasis, windowDays)}
          {" · "}Potential league avg: {category.league_mean == null ? "—" : formatValue(category.league_mean, category.key)}
        </p>
      </div>
    </article>
  );
}

function formatCategoryValue(category: FantasyTeamCategory) {
  if (category.value == null) return "—";
  return formatValue(category.value, category.key);
}

function formatActualValue(value: number, key: string) {
  if (key === "fg_pct" || key === "ft_pct") return `${value.toFixed(1)}%`;
  if (key === "assist_turnover") return value.toFixed(2);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function potentialScopeLabel(key: string, basis: "season" | "window", windowDays: number) {
  if (key === "fg_pct" || key === "ft_pct") return "Attempt-weighted rate for current roster";
  if (key === "assist_turnover") return "Current-roster assists/turnovers ratio";
  return basis === "season"
    ? "Sum of player season per-game averages"
    : `Current players' totals over the last ${windowDays} days`;
}

function formatFetchedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Athens",
  }).format(new Date(value));
}

function formatValue(value: number, key: string) {
  if (key === "fg_pct" || key === "ft_pct") return `${value.toFixed(1)}%`;
  if (key === "assist_turnover") return value.toFixed(2);
  return value.toFixed(1);
}

function formatRank(rank: number) {
  return Number.isInteger(rank) ? rank.toFixed(0) : rank.toFixed(1);
}
