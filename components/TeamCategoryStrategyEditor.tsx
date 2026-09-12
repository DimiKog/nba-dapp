"use client";

import { useMemo, useState } from "react";
import type {
  FantasyCategoryVerdict,
  FantasyTeamCategory,
  FantasyTeamCategoryProfile,
} from "@/lib/api";
import {
  CATEGORY_LABELS,
  type StrategyStance,
  type TeamCategoryStrategy,
} from "@/lib/teamCategoryStrategy";

const STANCES: Array<{
  key: StrategyStance;
  label: string;
  active: string;
}> = [
  { key: "target", label: "Target", active: "border-emerald-500 bg-emerald-500 text-white" },
  { key: "neutral", label: "Neutral", active: "border-slate-500 bg-slate-600 text-white" },
  { key: "punt", label: "Punt", active: "border-rose-500 bg-rose-500 text-white" },
];

function strategyState(strategy: TeamCategoryStrategy): Record<string, StrategyStance> {
  return Object.fromEntries(
    strategy.categories.map((category) => [category.key, category.stance]),
  );
}

function sameState(
  left: Record<string, StrategyStance>,
  right: Record<string, StrategyStance>,
) {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length
    && keys.every((key) => left[key] === right[key]);
}

export default function TeamCategoryStrategyEditor({
  league,
  initialStrategy,
  initialProfile,
}: {
  league: "ldl" | "bdb";
  initialStrategy: TeamCategoryStrategy;
  initialProfile: FantasyTeamCategoryProfile | null;
}) {
  const [saved, setSaved] = useState(initialStrategy);
  const [stances, setStances] = useState(() => strategyState(initialStrategy));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<TeamCategoryStrategy | null>(null);
  const dirty = !sameState(stances, strategyState(saved));
  const counts = useMemo(() => ({
    target: Object.values(stances).filter((value) => value === "target").length,
    neutral: Object.values(stances).filter((value) => value === "neutral").length,
    punt: Object.values(stances).filter((value) => value === "punt").length,
  }), [stances]);
  const profileByCategory = useMemo(
    () => new Map(initialProfile?.categories.map((category) => [category.key, category]) ?? []),
    [initialProfile],
  );

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    setConflict(null);
    const response = await fetch(`/api/fantasy/${league}/category-strategy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expected_version: saved.version,
        target_categories: Object.entries(stances)
          .filter(([, stance]) => stance === "target")
          .map(([key]) => key),
        punt_categories: Object.entries(stances)
          .filter(([, stance]) => stance === "punt")
          .map(([key]) => key),
      }),
    }).catch(() => null);
    if (!response) {
      setError("The strategy service could not be reached. Your changes were not saved.");
      setSaving(false);
      return;
    }
    const payload = await response.json().catch(() => null) as
      | TeamCategoryStrategy
      | { error?: string; code?: string; current?: TeamCategoryStrategy }
      | null;
    if (response.status === 409 && payload && "current" in payload && payload.current) {
      setConflict(payload.current);
      setError("Another manager saved a newer strategy for this team.");
    } else if (!response.ok || !payload || !("categories" in payload)) {
      setError(
        payload && "error" in payload && payload.error
          ? payload.error
          : "Your changes were not saved.",
      );
    } else {
      setSaved(payload);
      setStances(strategyState(payload));
      setMessage(payload.write_status === "unchanged" ? "Strategy already up to date." : "Strategy saved.");
    }
    setSaving(false);
  }

  function loadLatest() {
    if (!conflict) return;
    setSaved(conflict);
    setStances(strategyState(conflict));
    setConflict(null);
    setError(null);
    setMessage("Loaded the latest shared strategy. Review it before editing.");
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        {STANCES.map((stance) => (
          <div key={stance.key} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-black text-slate-900 dark:text-white">{stance.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {stance.key === "target" && "A category you deliberately want trades and free-agent moves to strengthen."}
              {stance.key === "neutral" && "Useful, but not a category that should drive a decision by itself."}
              {stance.key === "punt" && "A category you accept being weak in so resources can improve your priorities."}
            </p>
          </div>
        ))}
      </section>

      <CurrentProfileSummary profile={initialProfile} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950 dark:text-white">Category priorities</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {counts.target} target · {counts.neutral} neutral · {counts.punt} punt
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {saved.version === null ? "Not saved yet" : `Version ${saved.version}`}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {saved.categories.map((category) => (
            <div key={category.key} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)_auto] lg:items-center">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {CATEGORY_LABELS[category.key] ?? category.key}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">Your current season profile</p>
              </div>
              <CurrentCategoryEvidence category={profileByCategory.get(category.key)} />
              <div role="radiogroup" aria-label={`${CATEGORY_LABELS[category.key] ?? category.key} strategy`} className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {STANCES.map((stance) => {
                  const active = stances[category.key] === stance.key;
                  return (
                    <button
                      key={stance.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setStances((current) => ({ ...current, [category.key]: stance.key }))}
                      className={`min-w-20 rounded-lg border px-3 py-2 text-xs font-black transition ${
                        active
                          ? stance.active
                          : "border-transparent text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                      }`}
                    >
                      {stance.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <p className="font-bold">{error}</p>
          {conflict && (
            <button type="button" onClick={loadLatest} className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-black text-white hover:bg-rose-800">
              Load latest strategy
            </button>
          )}
        </div>
      )}
      {message && <p role="status" className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{message}</p>}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {saved.created_by && saved.created_at
            ? `Last saved by ${saved.created_by.display_name} · ${new Date(saved.created_at).toLocaleString()}`
            : "No strategy has been saved for this team and season."}
        </p>
        <button
          type="button"
          disabled={!dirty || saving || Boolean(conflict)}
          onClick={save}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          {saving ? "Saving…" : "Save strategy"}
        </button>
      </div>
    </div>
  );
}

const PROFILE_STYLES: Record<FantasyCategoryVerdict, {
  label: string;
  badge: string;
  marker: string;
}> = {
  strength: {
    label: "Strong",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    marker: "bg-emerald-500",
  },
  neutral: {
    label: "Middle",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    marker: "bg-slate-500",
  },
  weakness: {
    label: "Weak",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    marker: "bg-rose-500",
  },
  insufficient_data: {
    label: "Limited data",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    marker: "bg-amber-500",
  },
};

function CurrentProfileSummary({
  profile,
}: {
  profile: FantasyTeamCategoryProfile | null;
}) {
  if (!profile) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm font-black text-amber-900 dark:text-amber-200">Current profile unavailable</p>
        <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">
          You can still set strategy, but current season ranks could not be loaded. No category was selected automatically.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="px-5 py-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          Current reality · Season
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
          What should your team preserve—and what should it change?
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Your profile shows where the roster ranks today. Use it as evidence: keep an existing strength,
          invest in another category, or deliberately punt one. It never changes your choices automatically.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ProfileGroup
            title="Currently strong"
            values={profile.strengths}
            empty="No top-third categories yet"
            tone="strong"
          />
          <ProfileGroup
            title="Currently weak"
            values={profile.weaknesses}
            empty="No bottom-third categories"
            tone="weak"
          />
        </div>
      </div>
    </section>
  );
}

function ProfileGroup({
  title,
  values,
  empty,
  tone,
}: {
  title: string;
  values: string[];
  empty: string;
  tone: "strong" | "weak";
}) {
  const chip = tone === "strong"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300";
  return (
    <div className="rounded-xl border border-white/80 bg-white/75 p-4 dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length ? values.map((value) => (
          <span key={value} className={`rounded-full px-2.5 py-1 text-xs font-bold ${chip}`}>
            {value}
          </span>
        )) : <span className="text-xs text-slate-400">{empty}</span>}
      </div>
    </div>
  );
}

function CurrentCategoryEvidence({
  category,
}: {
  category: FantasyTeamCategory | undefined;
}) {
  if (!category) {
    return <p className="text-xs text-slate-400">Current rank unavailable</p>;
  }

  const style = PROFILE_STYLES[category.verdict];
  const markerPosition = category.z == null
    ? 50
    : Math.max(4, Math.min(96, 50 + (category.z / 2) * 46));
  const rank = category.league_rank == null
    ? "Rank unavailable"
    : `#${formatRank(category.league_rank)} of ${category.eligible_teams}`;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-200">{rank}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${style.badge}`}>
          {style.label}
        </span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-gradient-to-r from-rose-200 via-slate-200 to-emerald-200 dark:from-rose-950 dark:via-slate-700 dark:to-emerald-950" aria-hidden="true">
        <span className="absolute left-1/2 top-[-2px] h-2.5 w-px bg-slate-400" />
        {category.z != null && (
          <span
            className={`absolute top-[-3px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white shadow-sm dark:border-slate-900 ${style.marker}`}
            style={{ left: `${markerPosition}%` }}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        <span>Weak</span><span>League middle</span><span>Strong</span>
      </div>
    </div>
  );
}

function formatRank(rank: number) {
  return Number.isInteger(rank) ? rank.toFixed(0) : rank.toFixed(1);
}
