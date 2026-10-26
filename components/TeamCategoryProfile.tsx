"use client";

import { useState } from "react";
import type {
  FantasyTeamCategory,
  FantasyTeamCategoryProfile,
  FantasySeasonCategoryActuals,
} from "@/lib/api";

type ProfileView = "season" | "window";

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
}: {
  seasonProfile: FantasyTeamCategoryProfile;
  windowProfile: FantasyTeamCategoryProfile | null;
  seasonActuals: FantasySeasonCategoryActuals | null;
}) {
  const [view, setView] = useState<ProfileView>("season");
  const selected = view === "window" && windowProfile ? windowProfile : seasonProfile;
  const windowFallback =
    view === "window" &&
    selected.basis_requested === "window" &&
    selected.basis_used === "season";

  return (
    <section id="team-analysis" className="mt-10 scroll-mt-32">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              Team intelligence
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
              Category profile
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Fantrax shows what has counted this season. Roster potential compares the players currently owned by all {selected.sample.league_teams} {selected.league.name} teams, including Reserve and Injured Reserve.
            </p>
          </div>
          <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <ViewButton active={view === "season"} onClick={() => setView("season")}>
              Potential · season
            </ViewButton>
            <ViewButton
              active={view === "window"}
              disabled={!windowProfile}
              onClick={() => setView("window")}
            >
              Potential · recent 14d
            </ViewButton>
          </div>
        </div>

        {windowFallback && (
          <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
            No qualifying games were found in the last 14 days. Season production is shown instead.
          </div>
        )}

        <div role="status" className={`border-b px-5 py-4 text-sm ${seasonActuals?.stale ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"}`}>
          <p className="font-bold">Actual season results · Fantrax Season Stats</p>
          <p className="mt-1 text-xs leading-relaxed">
            {seasonActuals
              ? `${seasonActuals.stale ? "Last verified snapshot" : "Year to date"} · ${seasonActuals.league_teams} teams · fetched ${formatFetchedAt(seasonActuals.fetched_at)}${seasonActuals.stale ? " · Fantrax is temporarily unavailable" : ""}`
              : "Temporarily unavailable. Roster potential remains visible below; no actual rank is inferred."}
          </p>
        </div>

        <div className="grid gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700 md:grid-cols-2">
          <ProfileSummary
            title="Roster potential strengths"
            values={selected.strengths}
            empty="No top-third categories"
            tone="strength"
          />
          <ProfileSummary
            title="Roster potential weaknesses"
            values={selected.weaknesses}
            empty="No bottom-third categories"
            tone="weakness"
          />
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {selected.categories.map((category) => (
            <CategoryCard
              key={category.key}
              category={category}
              actual={seasonActuals?.team.categories[category.key] ?? null}
              actualTeams={seasonActuals?.league_teams ?? null}
              potentialBasis={selected.basis_used}
              windowDays={selected.window.days}
            />
          ))}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {selected.sample.players_included} players included
          </span>
          {selected.sample.players_missing_stats > 0 && (
            <> · {selected.sample.players_missing_stats} without qualifying stats</>
          )}
          {" · "}Actual results come from Fantrax Year to Date. Potential uses the current full roster, so the values and ranks are not expected to match. FG% and FT% are attempt-weighted; lower turnovers rank better.
          {selected.basis_used === "window" && (
            <> Recent figures use all currently owned players, not historical active lineups.</>
          )}
        </div>
      </div>
    </section>
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

function CategoryCard({
  category,
  actual,
  actualTeams,
  potentialBasis,
  windowDays,
}: {
  category: FantasyTeamCategory;
  actual: { rank: number; value: number } | null;
  actualTeams: number | null;
  potentialBasis: "season" | "window";
  windowDays: number;
}) {
  const style = VERDICT_STYLES[category.verdict];
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{category.label}</p>
      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-900 dark:bg-blue-950/30">
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Actual · Fantrax YTD</p>
        {actual && actualTeams ? (
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-2xl font-black tabular-nums text-slate-950 dark:text-white">{formatActualValue(actual.value, category.key)}</p>
            <p className="text-sm font-black tabular-nums text-blue-800 dark:text-blue-200">#{formatRank(actual.rank)} of {actualTeams}</p>
          </div>
        ) : <p className="mt-1 text-sm font-semibold text-slate-500">Unavailable</p>}
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Current-roster potential</p>
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${style.badge}`}>{style.label}</span>
        </div>
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
