"use client";

import { useEffect, useState } from "react";
import type { PlayerResearchEvidence, TradeCategoryChange } from "@/lib/api";
import {
  deletePrivateOutlook, EMPTY_PRIVATE_OUTLOOK, fetchPrivateOutlook,
  PRIVATE_OUTLOOK_UPDATED, savePrivateOutlook, type PrivateTradeOutlook,
} from "@/lib/privateTradeOutlook";
import { ReviewedInjuryNotice } from "@/components/ReviewedInjuryReport";

type ManagerAssessment = "unresolved" | "positive" | "neutral" | "concern";
type AvailabilityRisk = "unresolved" | "low" | "moderate" | "high";
type Upside = "unresolved" | "limited" | "steady" | "high";

type DecisionBrief = PrivateTradeOutlook;

type ResearchPlayer = {
  nba_id: number;
  name: string;
};

const EMPTY_DECISION_BRIEF = EMPTY_PRIVATE_OUTLOOK;

function profileStorageKey(league: "ldl" | "bdb", nbaId: number): string {
  return `trade-advisor-decision-brief:v1:${league}:${nbaId}`;
}

export function TradeDecisionComparison({
  league, player, modelFit, categoryChanges,
}: {
  league: "ldl" | "bdb";
  player: ResearchPlayer;
  modelFit: string;
  categoryChanges: TradeCategoryChange[];
}) {
  const [saved, setSaved] = useState<DecisionBrief | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchPrivateOutlook(league, player.nba_id)
        .then((brief) => { if (active) { setSaved(brief); setState("ready"); } })
        .catch(() => { if (active) setState("error"); });
    };
    refresh();
    window.addEventListener(PRIVATE_OUTLOOK_UPDATED, refresh);
    return () => { active = false; window.removeEventListener(PRIVATE_OUTLOOK_UPDATED, refresh); };
  }, [league, player.nba_id]);

  const gains = categoryChanges.filter((change) => ["weakness_resolved", "improved"].includes(change.transition));
  const declines = categoryChanges.filter((change) => ["new_weakness", "declined"].includes(change.transition));
  const highlights = [...gains, ...declines]
    .filter((change) => change.z_delta != null && Number.isFinite(change.z_delta))
    .sort((left, right) => Math.abs(right.z_delta!) - Math.abs(left.z_delta!))
    .slice(0, 3);

  return (
    <section className="mx-4 my-4 rounded-xl border border-indigo-300 bg-white p-4 dark:border-indigo-700 dark:bg-slate-900" aria-label={`Model and private assessment for ${player.name}`}>
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">Decision at a glance</p>
      <div className="mb-3"><ReviewedInjuryNotice league={league} nbaId={player.nba_id} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/40">
          <p className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">Model · category impact</p>
          <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{modelFit}</p>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{gains.length} meaningful gains · {declines.length} meaningful declines</p>
          {highlights.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Largest category changes">
            {highlights.map((change) => (
              <span key={change.key} className={`rounded-md px-2 py-1 text-[11px] font-bold ${change.z_delta! >= 0
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"}`}>
                {change.label} {change.z_delta! > 0 ? "+" : ""}{change.z_delta!.toFixed(2)}z
              </span>
            ))}
          </div>}
        </div>
        <div className="rounded-lg bg-indigo-50 p-4 dark:bg-indigo-950/40">
          <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">My assessment · {player.name}</p>
          <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
            {state === "loading" ? "Loading…" : state === "error" ? "Unavailable" : saved ? assessmentLabel(saved.assessment) : "Not assessed"}
          </p>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {saved ? `Availability: ${saved.availability} · upside: ${saved.upside}` : "Private to your account"}
          </p>
          {saved && (saved.note || saved.sourceUrl) && (
            <details className="mt-2 text-xs text-indigo-800 dark:text-indigo-200">
              <summary className="cursor-pointer font-bold">My reasoning and source</summary>
              {saved.note && <p className="mt-1 whitespace-pre-wrap break-words">{saved.note}</p>}
              {saved.sourceUrl && <a className="mt-1 block break-all underline" href={saved.sourceUrl} target="_blank" rel="noopener noreferrer">Open source{saved.sourceDate ? ` · ${saved.sourceDate}` : ""}</a>}
            </details>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">Different lenses, not two comparable scores. Your assessment never changes the model result. Edit it under player outlook and sources.</p>
    </section>
  );
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
  const [saved, setSaved] = useState<DecisionBrief>(EMPTY_DECISION_BRIEF);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const refresh = () => {
      fetchPrivateOutlook(league, player.nba_id)
        .then((brief) => { setSaved(brief ?? EMPTY_DECISION_BRIEF); setUnavailable(false); })
        .catch(() => setUnavailable(true));
    };
    refresh();
    window.addEventListener(PRIVATE_OUTLOOK_UPDATED, refresh);
    return () => window.removeEventListener(PRIVATE_OUTLOOK_UPDATED, refresh);
  }, [league, player.nba_id]);

  const hasProfile = Boolean(saved.savedAt);
  const needsReview = !hasProfile || saved.assessment === "concern" || saved.assessment === "unresolved" || saved.availability !== "low" || saved.upside === "unresolved";
  if (compact) {
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${needsReview
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200"}`}>
        {player.name}: {unavailable ? "private outlook unavailable" : hasProfile ? needsReview ? "outlook needs review" : "outlook reviewed" : "outlook not reviewed"}
      </span>
    );
  }
  return (
    <div className={`mx-4 mb-4 rounded-xl border px-4 py-3 text-sm ${needsReview
      ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-200"
      : "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-200"}`}>
      <p className="font-black">Model checks passed separately from player outlook</p>
      <p className="mt-1">
        {unavailable ? "Your private outlook is temporarily unavailable. Model scoring is unchanged."
          : hasProfile
          ? `${player.name}: role ${assessmentLabel(saved.assessment).toLowerCase()} · availability risk ${saved.availability} · upside ${saved.upside}.`
          : `${player.name}: role, availability and upside have not been reviewed. A green model result is not a complete trade recommendation.`}
      </p>
      {needsReview && <p className="mt-1 font-semibold">Review this player before deciding; the saved profile never changes the model tier.</p>}
      {hasProfile && saved.note && <p className="mt-1 line-clamp-2 text-xs">Your note: {saved.note}</p>}
      {hasProfile && <p className="mt-1 text-[11px] opacity-75">Saved {formatDateTime(saved.savedAt!)} · private to your account</p>}
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
  const [busy, setBusy] = useState(false);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const sourceUrlError = brief.sourceUrl.trim() !== "" && !isSafeHttpUrl(brief.sourceUrl);
  const hasChanges = loaded && JSON.stringify(brief) !== JSON.stringify(savedBrief);
  const coverage = decisionCoverage(research);

  useEffect(() => {
    const controller = new AbortController();
    fetchPrivateOutlook(league, player.nba_id, controller.signal)
      .then((saved) => {
        const next = saved ?? EMPTY_DECISION_BRIEF;
        setBrief(next);
        setSavedBrief(next);
        setStorageError(false);
        if (!saved) {
          try { setLegacyAvailable(Boolean(window.localStorage.getItem(storageKey))); } catch { /* Browser storage is optional. */ }
        } else {
          setLegacyAvailable(false);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStorageError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoaded(true); });
    return () => controller.abort();
  }, [league, player.nba_id, storageKey]);

  function updateBrief(patch: Partial<DecisionBrief>) {
    setBrief((current) => ({ ...current, ...patch, savedAt: current.savedAt }));
  }

  async function saveBrief() {
    if (sourceUrlError) return;
    setBusy(true);
    try {
      const next = await savePrivateOutlook(league, player.nba_id, brief);
      if (!next) throw new Error("Save returned no outlook");
      setBrief(next); setSavedBrief(next);
      setLegacyAvailable(false);
      window.dispatchEvent(new Event(PRIVATE_OUTLOOK_UPDATED));
      setStorageError(false);
    } catch {
      setStorageError(true);
    } finally {
      setBusy(false);
    }
  }

  async function clearBrief() {
    if (!savedBrief.savedAt) {
      setBrief(EMPTY_DECISION_BRIEF);
      return;
    }
    setBusy(true);
    try {
      await deletePrivateOutlook(league, player.nba_id);
      window.dispatchEvent(new Event(PRIVATE_OUTLOOK_UPDATED));
      setBrief(EMPTY_DECISION_BRIEF);
      setSavedBrief(EMPTY_DECISION_BRIEF);
      setStorageError(false);
    } catch {
      setStorageError(true);
    } finally {
      setBusy(false);
    }
  }

  function importLegacyBrief() {
    try {
      const value = window.localStorage.getItem(storageKey);
      if (value) setBrief({ ...parseDecisionBrief(value), savedAt: null });
    } catch { setStorageError(true); }
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
        {storageError && <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Private outlook is unavailable. No changes were saved; model analysis is unaffected.</p>}
        {legacyAvailable && <button type="button" onClick={importLegacyBrief} className="text-left text-xs font-bold text-indigo-700 underline dark:text-indigo-300">Import an older note saved in this browser (review before saving to your account)</button>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-200 pt-3 dark:border-indigo-900">
          <div className="text-[11px] text-slate-500">
            <p><strong>Private to your account.</strong> It does not affect the model result.</p>
            {brief.savedAt && <p className="mt-0.5">Last saved {formatDateTime(brief.savedAt)}{hasChanges ? " · unsaved changes" : ""}</p>}
            {!brief.savedAt && loaded && <p className="mt-0.5">Not saved yet.</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearBrief}
              disabled={busy || (!savedBrief.savedAt && !hasChanges)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={saveBrief}
              disabled={!loaded || busy || sourceUrlError || !hasChanges}
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
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
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
