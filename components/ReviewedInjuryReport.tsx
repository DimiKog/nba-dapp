"use client";

import { useEffect, useState } from "react";
import {
  fetchInjuryReport, INJURY_REPORT_UPDATED, saveInjuryReport,
  type InjuryReportDraft, type ReviewedInjuryReport,
} from "@/lib/playerInjuryReport";

type League = "ldl" | "bdb";

function useReport(league: League, nbaId: number) {
  const [report, setReport] = useState<ReviewedInjuryReport | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchInjuryReport(league, nbaId)
        .then((value) => {
          if (active) {
            setReport(value);
            setStale(Boolean(value && Date.now() - new Date(`${value.sourceDate}T00:00:00Z`).getTime() > 14 * 86400000));
            setState("ready");
          }
        })
        .catch(() => { if (active) setState("error"); });
    };
    refresh();
    window.addEventListener(INJURY_REPORT_UPDATED, refresh);
    return () => { active = false; window.removeEventListener(INJURY_REPORT_UPDATED, refresh); };
  }, [league, nbaId]);
  return { report, state, stale };
}

export function ReviewedInjuryNotice({ league, nbaId, showMissing = false }: { league: League; nbaId: number; showMissing?: boolean }) {
  return <ReviewedInjuryNoticeForPlayer key={`${league}:${nbaId}`} league={league} nbaId={nbaId} showMissing={showMissing} />;
}

function ReviewedInjuryNoticeForPlayer({ league, nbaId, showMissing }: { league: League; nbaId: number; showMissing: boolean }) {
  const { report, state, stale } = useReport(league, nbaId);
  if (state === "loading") return null;
  if (state === "error") return <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Injury report unavailable. Verify availability independently.</p>;
  if (!report) return showMissing
    ? <p className="text-xs text-slate-500">No commissioner-reviewed injury report is recorded. This does not confirm the player is healthy.</p>
    : null;
  const active = report.status !== "available";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${active
      ? "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"}`}>
      <p className="font-black">Commissioner-reviewed injury report · {report.status}{stale ? " · recheck needed" : ""}</p>
      <p className="mt-1">{report.summary}</p>
      <p className="mt-1 text-xs opacity-80">Source dated {report.sourceDate}{report.expectedReturnDate ? ` · reported return estimate ${report.expectedReturnDate}` : ""}. This report is not a live medical status and does not change the model score.</p>
      <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold underline">Read original source ↗</a>
    </div>
  );
}

const EMPTY_REPORT: InjuryReportDraft = {
  status: "injured", summary: "", sourceUrl: "", sourceDate: "", expectedReturnDate: "",
};

export function InjuryReportEditor({ league, nbaId }: { league: League; nbaId: number }) {
  return <InjuryReportEditorForPlayer key={`${league}:${nbaId}`} league={league} nbaId={nbaId} />;
}

function InjuryReportEditorForPlayer({ league, nbaId }: { league: League; nbaId: number }) {
  const { report, state } = useReport(league, nbaId);
  const [draft, setDraft] = useState<InjuryReportDraft>(EMPTY_REPORT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await saveInjuryReport(league, nbaId, draft);
      setDraft(EMPTY_REPORT);
      window.dispatchEvent(new Event(INJURY_REPORT_UPDATED));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <summary className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-200">Record a sourced injury update</summary>
      <p className="mt-2 text-xs text-slate-500">Commissioner-reviewed facts are shared across leagues. Private player assessments remain separate. Append a new report to correct or resolve an older one.</p>
      {state === "ready" && report && <p className="mt-2 text-xs text-slate-500">Latest source: {report.sourceDate} · {report.status}</p>}
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Status
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as InjuryReportDraft["status"] })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
            <option value="injured">Injured</option><option value="recovering">Recovering</option><option value="available">Reported available</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Source date
          <input type="date" required value={draft.sourceDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDraft({ ...draft, sourceDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </label>
        <label className="sm:col-span-2 text-xs font-bold text-slate-600 dark:text-slate-300">What the source reports
          <textarea required minLength={5} maxLength={500} rows={2} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Original source URL
          <input type="url" required pattern="https://.*" placeholder="https://…" value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Reported return estimate (optional)
          <input type="date" value={draft.expectedReturnDate} min={draft.sourceDate || undefined} onChange={(event) => setDraft({ ...draft, expectedReturnDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </label>
        {error && <p role="alert" className="sm:col-span-2 text-xs font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save reviewed report"}</button>
      </form>
    </details>
  );
}
