"use client";

import { useEffect, useState } from "react";
import { fetchPlayerResearch, type PlayerResearchEvidence } from "@/lib/api";
import TradeDecisionBrief from "@/components/TradeDecisionBrief";
import { InjuryReportEditor, ReviewedInjuryNotice } from "@/components/ReviewedInjuryReport";

export default function PlayerOutlookPilot({
  league, nbaId, name, canReviewInjury, freeAgent,
}: {
  league: "ldl" | "bdb";
  nbaId: number;
  name: string;
  canReviewInjury: boolean;
  freeAgent: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [research, setResearch] = useState<PlayerResearchEvidence | null>(null);
  const [researchState, setResearchState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    fetchPlayerResearch(league, nbaId, { signal: controller.signal })
      .then((value) => { setResearch(value); setResearchState("ready"); })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setResearchState("error");
      });
    return () => controller.abort();
  }, [expanded, league, nbaId]);

  const baseline = research?.completed_season_baseline;
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-indigo-200 bg-white dark:border-indigo-900 dark:bg-slate-900" aria-label={`Player outlook for ${name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">Player outlook · pilot</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Role, availability and upside</h2>
          <p className="text-xs text-slate-500">{freeAgent ? "Free-agent context" : "Rostered-player context"} · observed facts and your private assessment are separate</p>
        </div>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="rounded-lg border border-indigo-300 px-3 py-2 text-xs font-bold text-indigo-800 dark:border-indigo-700 dark:text-indigo-200">
          {expanded ? "Close outlook" : "Open outlook"}
        </button>
      </div>
      <div className="border-t border-indigo-100 p-4 dark:border-indigo-900"><ReviewedInjuryNotice league={league} nbaId={nbaId} showMissing /></div>
      {expanded && (
        <div className="space-y-4 border-t border-indigo-100 p-4 dark:border-indigo-900">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
              <p className="text-[10px] font-black uppercase text-slate-500">Historical role · not a projection</p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {researchState === "loading" ? "Loading…" : baseline?.games
                  ? `${baseline.season}: ${baseline.games} GP · ${baseline.minutes ?? "—"} min`
                  : "No completed-season baseline available"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
              <p className="text-[10px] font-black uppercase text-slate-500">Current role evidence</p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{research?.role_signal.status === "observed_trend"
                ? `${research.role_signal.direction} · ${research.role_signal.recent_minutes ?? "—"} recent min`
                : "Not established from recent games"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
              <p className="text-[10px] font-black uppercase text-slate-500">Acquisition</p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{freeAgent ? "Check tokens, cap and roster slot separately" : "Trade terms assessed separately"}</p>
            </div>
          </div>
          {researchState === "error" && <p className="rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-900">Research is unavailable; do not infer that no role or injury news exists.</p>}
          {research && <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-bold text-indigo-700 dark:text-indigo-300">News coverage and limitations</summary>
            <p className="mt-2 text-xs text-slate-500">ESPN exact-tag coverage: {research.coverage.status.replaceAll("_", " ")}. An empty feed is not evidence of health or playing time.</p>
            {research.news_evidence.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm font-semibold text-blue-700 underline dark:text-blue-300">{item.headline ?? "Player report"} · {item.published_at.slice(0, 10)}</a>)}
          </details>}
          <TradeDecisionBrief league={league} player={{ nba_id: nbaId, name }} research={research} />
          {canReviewInjury && <InjuryReportEditor league={league} nbaId={nbaId} />}
        </div>
      )}
    </section>
  );
}
