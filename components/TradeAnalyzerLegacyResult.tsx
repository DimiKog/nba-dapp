"use client";

import Link from "next/link";
import TeamLogo from "@/components/TeamLogo";
import TradePlayerResearchPanel from "@/components/TradePlayerResearchPanel";
import { TradeDecisionComparison } from "@/components/TradeDecisionBrief";
import { basisLabel, capResultLabel, FallbackBanner, formatSigned, MethodNote, phaseLabel } from "@/components/TradeAnalyzerShared";
import { formatRank, PayrollComparison, SelectedPlayer, StrategyImpactPanel } from "@/components/TradeAnalyzerViewShared";
import type { FantasyPlayerPerformance, FantasyTradeAnalysis, TradeCategoryChange, TradeTeamResult, TradeWarning } from "@/lib/api";
import type { LeagueSlug } from "@/lib/leagues";

export function TradeAnalysisResult({ analysis, outgoing, incoming, league }: {
  analysis: FantasyTradeAnalysis;
  outgoing: FantasyPlayerPerformance | null;
  incoming: FantasyPlayerPerformance | null;
  league: LeagueSlug;
}) {
  return (
    <section className="mt-6 space-y-5">
      {analysis.fallback_reason && <FallbackBanner />}
      <VerdictBanner analysis={analysis} />
      <StrategyImpactPanel
        strategy={analysis.strategy}
        changes={analysis.selected_team.category_changes}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ExchangePlayer title="Outgoing" player={outgoing} fallback={analysis.trade.outgoing.name} league={league} />
        <ExchangePlayer title="Incoming" player={incoming} fallback={analysis.trade.incoming.name} league={league} />
      </div>
      {incoming?.nba_id && (
        <div className="-mx-4">
          <TradeDecisionComparison
            league={league}
            player={{ nba_id: incoming.nba_id, name: incoming.name }}
            modelFit={`Category fit ${formatSigned(analysis.selected_team.category_score.score)}`}
            categoryChanges={analysis.selected_team.category_changes}
          />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <TeamImpact result={analysis.selected_team} league={league} primary />
        <TeamImpact result={analysis.counterparty_team} league={league} />
      </div>
      <TradePlayerResearchPanel
        league={league}
        players={incoming?.nba_id ? [{
          nba_id: incoming.nba_id,
          name: incoming.name,
          nba_team: incoming.nba_team,
          position: incoming.position,
        }] : []}
      />
      <details className="rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer p-4 font-black text-slate-900 dark:text-white">Five-year payroll detail</summary>
        <div className="p-4 pt-0"><PayrollComparison selected={analysis.selected_team} counterparty={analysis.counterparty_team} /></div>
      </details>
      {analysis.verdict.warnings.length > 0 && <WarningList warnings={analysis.verdict.warnings} />}
      <MethodNote>One-for-one simulation · attempt-weighted percentages · lower turnovers rank better · missing contracts count as $0.</MethodNote>
    </section>
  );
}

function VerdictBanner({ analysis }: { analysis: FantasyTradeAnalysis }) {
  const tone = verdictTone(analysis.verdict.key);
  return (
    <div className={`rounded-2xl border p-5 ${tone.box}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${tone.text}`}>Overall verdict</p>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">{analysis.verdict.confidence} confidence</span>
      </div>
      <h2 className={`mt-1 text-2xl font-black ${tone.text}`}>{analysis.verdict.headline}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{phaseLabel(analysis.season_phase)} policy · {basisLabel(analysis.basis_used)}</p>
    </div>
  );
}

function ExchangePlayer({ title, player, fallback, league }: { title: string; player: FantasyPlayerPerformance | null; fallback: string; league: LeagueSlug }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{title}</p>
      {player ? <SelectedPlayer player={player} /> : <p className="mt-2 font-black text-slate-950 dark:text-white">{fallback}</p>}
      {player?.player_id && <Link href={`/players/${player.player_id}?league=${league}&from=trade`} className="mt-3 inline-block text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">Open player intelligence →</Link>}
    </div>
  );
}

function TeamImpact({ result, league, primary = false }: { result: TradeTeamResult; league: LeagueSlug; primary?: boolean }) {
  const meaningful = result.category_changes.filter((change) => change.transition !== "unchanged");
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 ${primary ? "border-blue-300 dark:border-blue-800" : "border-slate-200 dark:border-slate-700"}`}>
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <TeamLogo league={league} logo={result.team.logo} name={result.team.name} size={40} />
        <div>
          <p className="font-black text-slate-950 dark:text-white">{result.team.name}</p>
          <p className="text-xs text-slate-500">{primary ? "Your team" : "Trade partner"} · {capResultLabel(result.payroll.current_cap_result)}</p>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Meaningful category changes</h3>
        {meaningful.length ? (
          <div className="mt-3 space-y-2">
            {meaningful.map((change) => <CategoryChangeRow key={change.key} change={change} />)}
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">No meaningful category movement.</p>}
        <details className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <summary className="cursor-pointer text-xs font-bold text-blue-600 dark:text-blue-400">View all {result.category_changes.length} categories</summary>
          <div className="mt-3 space-y-2">{result.category_changes.map((change) => <CategoryChangeRow key={change.key} change={change} compact />)}</div>
        </details>
      </div>
    </div>
  );
}

function CategoryChangeRow({ change, compact = false }: { change: TradeCategoryChange; compact?: boolean }) {
  const positive = ["weakness_resolved", "improved"].includes(change.transition);
  const negative = ["new_weakness", "declined"].includes(change.transition);
  return (
    <div className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-3 ${compact ? "py-1.5" : "bg-slate-50 py-2.5 dark:bg-slate-800/60"}`}>
      <div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{change.label}</p>
        {!compact && <p className={`text-[10px] font-bold uppercase ${positive ? "text-emerald-600" : negative ? "text-red-600" : "text-slate-400"}`}>{transitionLabel(change.transition)}</p>}
      </div>
      <p className="text-xs tabular-nums text-slate-500">#{formatRank(change.before.league_rank)} → #{formatRank(change.after.league_rank)}</p>
      <p className={`min-w-14 text-right text-sm font-black tabular-nums ${positive ? "text-emerald-600" : negative ? "text-red-600" : "text-slate-500"}`}>{change.z_delta == null ? "—" : `${formatSigned(change.z_delta)} z`}</p>
    </div>
  );
}



function WarningList({ warnings }: { warnings: TradeWarning[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Warnings and assumptions</p>
      <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
        {warnings.map((warning, index) => <li key={`${warning.key}-${index}`}>• {warningLabel(warning)}</li>)}
      </ul>
    </div>
  );
}

function transitionLabel(transition: TradeCategoryChange["transition"]) {
  return transition.replaceAll("_", " ");
}

function verdictTone(key: FantasyTradeAnalysis["verdict"]["key"]) {
  if (key === "likely_improvement") return { box: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30", text: "text-emerald-800 dark:text-emerald-300" };
  if (["likely_decline", "not_cap_compliant"].includes(key)) return { box: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30", text: "text-red-800 dark:text-red-300" };
  return { box: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30", text: "text-amber-800 dark:text-amber-300" };
}

function warningLabel(warning: TradeWarning) {
  if (warning.key === "missing_stats") return `${warning.name ?? "Player"} has incomplete performance data.`;
  if (warning.key === "missing_salary") return `${warning.name ?? "Player"} has no recorded salary and counts as $0.`;
  if (warning.key === "injury") return `${warning.name ?? "Player"} has an active injury alert.`;
  if (warning.key === "cap" || warning.key === "cap_screen") return `Cap result: ${warning.result ? capResultLabel(warning.result) : "review required"}.`;
  return warning.key.replaceAll("_", " ");
}
