"use client";

import { useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import {
  basisLabel,
  capResultLabel,
  capTone,
  ChipList,
  ConfidenceBadge,
  FallbackBanner,
  formatSigned,
  MethodNote,
  phaseLabel,
} from "@/components/TradeAnalyzerShared";
import type { FantasyTradePartners, TradePartner } from "@/lib/api";

export default function TradeAnalyzerDestinationResult({ payload, onExplore }: { payload: FantasyTradePartners; onExplore: (partner: TradePartner) => void }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? payload.partners : payload.partners.slice(0, 6);
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-5 dark:border-slate-700">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Trade market</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Best destinations for {payload.outgoing.name}</h2>
        <p className="mt-1 text-sm text-slate-500">{payload.total_partners} teams screened · {basisLabel(payload.basis_used)} · {phaseLabel(payload.season_phase)}</p>
      </div>
      {payload.fallback_reason && <FallbackBanner />}
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((partner) => (
          <article key={partner.team.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">#{partner.rank}</span>
              <TeamLogo league={payload.league.slug} logo={partner.team.logo} name={partner.team.name} size={42} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-black text-slate-950 dark:text-white">{partner.team.name}</h3>
                <p className="text-xs text-slate-500">Fit {formatSigned(partner.fit_score)} · Approach {formatSigned(partner.approach_score)}</p>
              </div>
              <ConfidenceBadge confidence={partner.confidence} />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{partner.reason}</p>
            <ChipList label="Helps" values={partner.helps} tone="positive" />
            <ChipList label="Harms" values={partner.harms} tone="danger" />
            <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cap screen</p>
              <p className={`mt-1 text-sm font-bold ${capTone(partner.cap_screen.result)}`}>{capResultLabel(partner.cap_screen.result)}</p>
              <p className="mt-1 text-xs text-slate-500">Return salary is not included yet.</p>
            </div>
            <button type="button" onClick={() => onExplore(partner)} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">
              Explore possible returns
            </button>
          </article>
        ))}
      </div>
      {payload.partners.length > 6 && (
        <div className="border-t border-slate-200 px-4 py-3 text-center dark:border-slate-700">
          <button type="button" onClick={() => setShowAll((current) => !current)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:text-slate-300">
            {showAll ? "Show top six only" : `Show all ${payload.partners.length} teams`}
          </button>
        </div>
      )}
      <MethodNote>Destination ranking is a market screen, not a completed trade. Category fit and cap feasibility are finalized only after selecting a return player.</MethodNote>
    </section>
  );
}
