"use client";

import { useMemo, useState } from "react";
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
}: {
  league: "ldl" | "bdb";
  initialStrategy: TeamCategoryStrategy;
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
            <div key={category.key} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {CATEGORY_LABELS[category.key] ?? category.key}
                </p>
                <p className="text-xs text-slate-400">{category.key}</p>
              </div>
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
