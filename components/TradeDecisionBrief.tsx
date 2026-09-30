"use client";

import { useEffect, useState } from "react";
import type { PlayerResearchEvidence } from "@/lib/api";

type ManagerAssessment = "unresolved" | "positive" | "neutral" | "concern";
type AvailabilityRisk = "unresolved" | "low" | "moderate" | "high";
type Upside = "unresolved" | "limited" | "steady" | "high";

type DecisionBrief = {
  assessment: ManagerAssessment;
  availability: AvailabilityRisk;
  upside: Upside;
  note: string;
  sourceUrl: string;
  sourceDate: string;
  savedAt: string | null;
};

type ResearchPlayer = {
  nba_id: number;
  name: string;
};

const EMPTY_DECISION_BRIEF: DecisionBrief = {
  assessment: "unresolved",
  availability: "unresolved",
  upside: "unresolved",
  note: "",
  sourceUrl: "",
  sourceDate: "",
  savedAt: null,
};

const PROFILE_UPDATED_EVENT = "trade-advisor-profile-updated";

function profileStorageKey(league: "ldl" | "bdb", nbaId: number): string {
  return `trade-advisor-decision-brief:v1:${league}:${nbaId}`;
}

export function TradeProfileSignal({
  league,
  player,
  compact = false,
}: {
  league: "ldl" | "bdb";
  player: ResearchPlayer;
  compact?: boolean;
}) {
  const storageKey = profileStorageKey(league, player.nba_id);
  const [saved, setSaved] = useState<DecisionBrief>(EMPTY_DECISION_BRIEF);

  useEffect(() => {
    const refresh = () => {
      try {
        const value = window.localStorage.getItem(storageKey);
        setSaved(value ? parseDecisionBrief(value) : EMPTY_DECISION_BRIEF);
      } catch {
        setSaved(EMPTY_DECISION_BRIEF);
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) refresh();
    };
    refresh();
    window.addEventListener(PROFILE_UPDATED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey]);

  const hasProfile = Boolean(saved.savedAt);
  const needsReview = !hasProfile || saved.assessment === "concern" || saved.assessment === "unresolved" || saved.availability !== "low" || saved.upside === "unresolved";
  if (compact) {
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${needsReview
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200"}`}>
        {player.name}: {hasProfile ? needsReview ? "outlook needs review" : "outlook reviewed" : "outlook not reviewed"}
      </span>
    );
  }
  return (
    <div className={`mx-4 mb-4 rounded-xl border px-4 py-3 text-sm ${needsReview
      ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-200"
      : "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-200"}`}>
      <p className="font-black">Model checks passed separately from player outlook</p>
      <p className="mt-1">
        {hasProfile
          ? `${player.name}: role ${assessmentLabel(saved.assessment).toLowerCase()} · availability risk ${saved.availability} · upside ${saved.upside}.`
          : `${player.name}: role, availability and upside have not been reviewed. A green model result is not a complete trade recommendation.`}
      </p>
      {needsReview && <p className="mt-1 font-semibold">Review this player before deciding; the saved profile never changes the model tier.</p>}
      {hasProfile && saved.note && <p className="mt-1 line-clamp-2 text-xs">Your note: {saved.note}</p>}
      {hasProfile && <p className="mt-1 text-[11px] opacity-75">Saved {formatDateTime(saved.savedAt!)} · only in this browser</p>}
    </div>
  );
}

export default function TradeDecisionBrief({
  league,
  player,
  research,
}: {
  league: "ldl" | "bdb";
  player: ResearchPlayer;
  research: PlayerResearchEvidence | null;
}) {
  const storageKey = profileStorageKey(league, player.nba_id);
  const [brief, setBrief] = useState<DecisionBrief>(EMPTY_DECISION_BRIEF);
  const [savedBrief, setSavedBrief] = useState<DecisionBrief>(EMPTY_DECISION_BRIEF);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const sourceUrlError = brief.sourceUrl.trim() !== "" && !isSafeHttpUrl(brief.sourceUrl);
  const hasChanges = loaded && JSON.stringify(brief) !== JSON.stringify(savedBrief);
  const coverage = decisionCoverage(research);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const stored = window.localStorage.getItem(storageKey);
        const parsed = stored ? parseDecisionBrief(stored) : EMPTY_DECISION_BRIEF;
        setBrief(parsed);
        setSavedBrief(parsed);
      } catch {
        setStorageError(true);
      } finally {
        setLoaded(true);
      }
    });
    return () => { active = false; };
  }, [storageKey]);

  function updateBrief(patch: Partial<DecisionBrief>) {
    setBrief((current) => ({ ...current, ...patch, savedAt: current.savedAt }));
  }

  function saveBrief() {
    if (sourceUrlError) return;
    const next = { ...brief, savedAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      setBrief(next);
      setSavedBrief(next);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  function clearBrief() {
    try {
      window.localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      setBrief(EMPTY_DECISION_BRIEF);
      setSavedBrief(EMPTY_DECISION_BRIEF);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="border-b border-indigo-200 px-4 py-3 dark:border-indigo-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">Manager decision brief</p>
            <h4 className="mt-1 text-base font-black text-slate-950 dark:text-white">Your read on {player.name}</h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Your dated judgment, kept separate from the model result.</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${assessmentTone(brief.assessment)}`}>
            {assessmentLabel(brief.assessment)}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <EvidenceStatus label="Role evidence" value={coverage.role} tone={coverage.roleTone} />
          <EvidenceStatus label="Automatic news" value={coverage.news} tone={coverage.newsTone} />
        </div>

        <fieldset>
          <legend className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Your assessment</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["positive", "neutral", "concern", "unresolved"] as ManagerAssessment[]).map((assessment) => (
              <button
                key={assessment}
                type="button"
                aria-pressed={brief.assessment === assessment}
                onClick={() => updateBrief({ assessment })}
                className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
                  brief.assessment === assessment
                    ? assessmentSelectedTone(assessment)
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {assessmentLabel(assessment)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Availability risk
            <select value={brief.availability} onChange={(event) => updateBrief({ availability: event.target.value as AvailabilityRisk })} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <option value="unresolved">Not assessed</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Future upside
            <select value={brief.upside} onChange={(event) => updateBrief({ upside: event.target.value as Upside })} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <option value="unresolved">Not assessed</option>
              <option value="limited">Limited</option>
              <option value="steady">Steady</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          Why you expect this role, risk or upside
          <textarea
            value={brief.note}
            onChange={(event) => updateBrief({ note: event.target.value })}
            rows={3}
            maxLength={1000}
            placeholder="Example: Expected to gain minutes; injury history still needs checking."
            className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-950"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Source URL (optional)
            <input
              type="url"
              inputMode="url"
              value={brief.sourceUrl}
              onChange={(event) => updateBrief({ sourceUrl: event.target.value })}
              placeholder="https://…"
              aria-invalid={sourceUrlError}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-950"
            />
          </label>
          <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Source date
            <input
              type="date"
              value={brief.sourceDate}
              onChange={(event) => updateBrief({ sourceDate: event.target.value })}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-950"
            />
          </label>
        </div>

        {sourceUrlError && <p className="text-xs font-semibold text-red-700 dark:text-red-300">Use a complete http:// or https:// link.</p>}
        {storageError && <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">This browser could not save the brief. Your trade analysis is unaffected.</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-200 pt-3 dark:border-indigo-900">
          <div className="text-[11px] text-slate-500">
            <p><strong>Saved only in this browser.</strong> It does not affect the recommendation.</p>
            {brief.savedAt && <p className="mt-0.5">Last saved {formatDateTime(brief.savedAt)}{hasChanges ? " · unsaved changes" : ""}</p>}
            {!brief.savedAt && loaded && <p className="mt-0.5">Not saved yet.</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearBrief}
              disabled={!brief.savedAt && !hasChanges}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={saveBrief}
              disabled={!loaded || sourceUrlError || !hasChanges}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save brief
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceStatus({ label, value, tone }: { label: string; value: string; tone: "positive" | "warning" | "neutral" }) {
  const toneClass = tone === "positive"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
      : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-1 text-xs font-bold">{value}</p>
    </div>
  );
}

function decisionCoverage(research: PlayerResearchEvidence | null) {
  if (!research) {
    return {
      role: "Automatic role evidence unavailable",
      roleTone: "warning" as const,
      news: "Automatic news unavailable · verify independently",
      newsTone: "warning" as const,
    };
  }
  const role = research.role_signal.status === "observed_trend"
    ? `${research.role_signal.recent_games} recent games · ${research.role_signal.confidence} confidence`
    : research.role_signal.status === "historical_only"
      ? "Historical minutes only · current role unresolved"
      : "Not enough stored games · role unresolved";
  const news = research.coverage.status === "provider_unavailable"
    ? "Provider unavailable · verify independently"
    : research.news_evidence.length > 0
      ? `${research.news_evidence.length} exact player-tagged report${research.news_evidence.length === 1 ? "" : "s"}`
      : `No exact ESPN match in ${research.coverage.searched_days} days`;
  return {
    role,
    roleTone: research.role_signal.status === "observed_trend" ? "positive" as const : "warning" as const,
    news,
    newsTone: research.news_evidence.length > 0
      ? "positive" as const
      : research.coverage.status === "provider_unavailable" ? "warning" as const : "neutral" as const,
  };
}

function assessmentLabel(assessment: ManagerAssessment): string {
  if (assessment === "positive") return "Positive";
  if (assessment === "neutral") return "Neutral";
  if (assessment === "concern") return "Concern";
  return "Unresolved";
}

function assessmentTone(assessment: ManagerAssessment): string {
  if (assessment === "positive") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (assessment === "neutral") return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
  if (assessment === "concern") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function assessmentSelectedTone(assessment: ManagerAssessment): string {
  if (assessment === "positive") return "border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  if (assessment === "neutral") return "border-blue-500 bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200";
  if (assessment === "concern") return "border-red-500 bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
  return "border-slate-500 bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white";
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseDecisionBrief(value: string): DecisionBrief {
  try {
    const parsed = JSON.parse(value) as Partial<DecisionBrief>;
    const assessments: ManagerAssessment[] = ["unresolved", "positive", "neutral", "concern"];
    const assessment = assessments.includes(parsed.assessment as ManagerAssessment)
      ? parsed.assessment as ManagerAssessment
      : "unresolved";
    return {
      assessment,
      availability: (["unresolved", "low", "moderate", "high"] as AvailabilityRisk[]).includes(parsed.availability as AvailabilityRisk) ? parsed.availability as AvailabilityRisk : "unresolved",
      upside: (["unresolved", "limited", "steady", "high"] as Upside[]).includes(parsed.upside as Upside) ? parsed.upside as Upside : "unresolved",
      note: typeof parsed.note === "string" ? parsed.note.slice(0, 1000) : "",
      sourceUrl: typeof parsed.sourceUrl === "string" && (parsed.sourceUrl === "" || isSafeHttpUrl(parsed.sourceUrl)) ? parsed.sourceUrl : "",
      sourceDate: typeof parsed.sourceDate === "string" ? parsed.sourceDate : "",
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : null,
    };
  } catch {
    return EMPTY_DECISION_BRIEF;
  }
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}
