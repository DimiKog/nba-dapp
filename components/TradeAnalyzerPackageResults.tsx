"use client";

import Image from "next/image";
import TeamLogo from "@/components/TeamLogo";
import TradePlayerResearchPanel from "@/components/TradePlayerResearchPanel";
import { TradeDecisionComparison, TradeProfileSignal } from "@/components/TradeDecisionBrief";
import { ReviewedInjuryNotice } from "@/components/ReviewedInjuryReport";
import { basisLabel, capResultLabel, FallbackBanner, formatSigned, MethodNote } from "@/components/TradeAnalyzerShared";
import { AcquisitionContextPanel, formatMoney, formatRank, PayrollComparison, retainedValuePercent, StrategyImpactPanel } from "@/components/TradeAnalyzerViewShared";
import { photoUrl, type AutomaticTradePackageSuggestion, type FantasyAutomaticTradePackageSuggestions, type FantasyTradePackageAnalysis, type TradeAcquisitionContext, type TradeCategoryChange, type TradeCategoryStrategyContext, type TradePackageCompletionOption, type TradePackageProductionValue, type TradePlayerSummary } from "@/lib/api";
import type { LeagueSlug } from "@/lib/leagues";

export function OneForTwoSuggestionsResult({ payload }: { payload: FantasyAutomaticTradePackageSuggestions }) {
  const effectiveCounts = payload.suggestions.reduce(
    (counts, suggestion) => {
      counts[effectivePackageTier(suggestion)] += 1;
      return counts;
    },
    { proposable: 0, exploratory: 0, not_recommended: 0, not_assessed: 0 },
  );
  const majorValueGaps = payload.suggestions.filter((suggestion) => (
    effectiveProductionValue(suggestion).classification === "severely_uneven"
  )).length;
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-5 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Expanded trade market</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Two-player returns for {payload.outgoing_player.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payload.summary.returned} packages · {payload.summary.screened_pairs} pairs screened · {basisLabel(payload.basis_used)}
            </p>
          </div>
          <div className="flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{effectiveCounts.proposable} executable</span>
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">{effectiveCounts.exploratory} exploratory</span>
            {effectiveCounts.not_recommended > 0 && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{effectiveCounts.not_recommended} not recommended</span>}
            {majorValueGaps > 0 && <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-700 dark:bg-red-950 dark:text-red-300">{majorValueGaps} major value gap{majorValueGaps === 1 ? "" : "s"}</span>}
          </div>
        </div>
      </div>
      {payload.fallback_reason && <FallbackBanner />}
      <AcquisitionContextPanel context={payload.acquisition_context} />
      {payload.suggestions.length ? (
        <div className="space-y-5 p-4">
          {payload.suggestions.map((suggestion, index) => (
            <OneForTwoSuggestionCard
              key={`${suggestion.counterparty_team.team.id}-${suggestion.package.counterparty_team_sends.map((player) => player.nba_id).join("-")}`}
              suggestion={suggestion}
              rank={index + 1}
              league={payload.league.slug as LeagueSlug}
            />
          ))}
        </div>
      ) : <OneForTwoEmptyState payload={payload} />}
      <MethodNote>
        Automatic 1-for-2 search · exact category and payroll analysis · phase-aware cap rules · roster completion is always your explicit choice · no draft-pick value applied yet.
      </MethodNote>
    </section>
  );
}

function OneForTwoSuggestionCard({ suggestion, rank, league, assets = [], picksAssessed = false, showStrategyImpact = true, exactContext }: {
  suggestion: AutomaticTradePackageSuggestion;
  rank: number;
  league: LeagueSlug;
  assets?: FantasyTradePackageAnalysis["package"]["assets"];
  picksAssessed?: boolean;
  showStrategyImpact?: boolean;
  exactContext?: {
    acquisition: TradeAcquisitionContext;
    strategy?: TradeCategoryStrategyContext;
  };
}) {
  const legalAsProposed = suggestion.completion_status === "legal_as_proposed";
  const drops = suggestion.completion_options.drop_candidates;
  const expansions = suggestion.completion_options.expanded_packages;
  const hasCompletion = drops.length > 0 || expansions.length > 0;
  const effectiveTier = effectivePackageTier(suggestion);
  const productionValue = effectiveProductionValue(suggestion);
  const valueUsesCompletion = Boolean(suggestion.best_completion);
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col gap-4 bg-slate-50 p-4 dark:bg-slate-800/50 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">#{rank}</span>
          <TeamLogo league={league} logo={suggestion.counterparty_team.team.logo} name={suggestion.counterparty_team.team.name} size={44} />
          <div className="min-w-0">
            <h3 className="truncate font-black text-slate-950 dark:text-white">{suggestion.counterparty_team.team.name}</h3>
            <p className="text-xs text-slate-500">{exactContext ? "Your category fit" : "Fit"} {formatSigned(suggestion.selected_team.category_score.score)}{!exactContext && ` · partner ${suggestion.counterparty_team.acceptance.status}`}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {picksAssessed && <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Player-value assessment · picks excluded</span>}
          <TierBadge tier={effectiveTier} />
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${legalAsProposed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : hasCompletion ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
            {legalAsProposed ? "Legal as proposed" : hasCompletion ? "Completion required" : "No legal completion"}
          </span>
        </div>
      </div>

      {showStrategyImpact && (
        <StrategyImpactPanel
          strategy={suggestion.strategy}
          changes={suggestion.selected_team.category_changes}
          compact
        />
      )}

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] lg:items-stretch">
        <PackageSide title="You send" players={suggestion.package.selected_team_sends} picks={assets.filter((asset) => asset.from_team === "selected_team")} />
        <div className="flex items-center justify-center text-xl font-black text-slate-300">⇄</div>
        <PackageSide title="You receive" players={suggestion.package.counterparty_team_sends} picks={assets.filter((asset) => asset.from_team === "counterparty_team")} />
      </div>

      {exactContext && (
        <div className="mx-4 mb-4">
          <ManualTradeCategoryImpact changes={suggestion.selected_team.category_changes} strategy={exactContext.strategy} />
        </div>
      )}

      {exactContext ? (
        <details className="mx-4 mb-4 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/30">
          <summary className="cursor-pointer px-4 py-3 text-slate-800 dark:text-slate-100">
            <span className="inline-flex flex-wrap items-center gap-2 align-middle">
              <strong className="text-sm">Other checks</strong>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${suggestion.selected_team.cap_legality.eligible ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"}`}>
                Cap: {capResultLabel(suggestion.selected_team.payroll.current_cap_result)}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${productionValue.classification === "balanced" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}>
                Player value: {productionValueSummary(productionValue)}
              </span>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                {acquisitionSummary(exactContext.acquisition)}
              </span>
            </span>
          </summary>
          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <AcquisitionContextPanel context={exactContext.acquisition} />
            <ProductionValuePanel value={productionValue} usesCompletion={valueUsesCompletion} picksAssessed={picksAssessed} />
            <div className="grid gap-3 border-t border-slate-200 p-4 dark:border-slate-700 md:grid-cols-2">
              <PackageMetric label="Your category fit" value={formatSigned(suggestion.selected_team.category_score.score)} tone={suggestion.selected_team.category_score.score >= 0 ? "positive" : "danger"} />
              <PackageMetric label="Partner team impact" value={suggestion.counterparty_team.acceptance.reason} tone={suggestion.counterparty_team.acceptance.status === "positive" ? "positive" : "neutral"} />
            </div>
          </div>
        </details>
      ) : (
        <>
          {effectiveTier === "proposable" && suggestion.package.counterparty_team_sends.map((player) => (
            <TradeProfileSignal key={player.nba_id} league={league} player={player} />
          ))}
          <ProductionValuePanel value={productionValue} usesCompletion={valueUsesCompletion} picksAssessed={picksAssessed} />
          <div className="grid gap-3 border-t border-slate-200 p-4 dark:border-slate-700 md:grid-cols-3">
            <PackageMetric label="Your category fit" value={formatSigned(suggestion.selected_team.category_score.score)} tone={suggestion.selected_team.category_score.score >= 0 ? "positive" : "danger"} />
            <PackageMetric label="Your cap result" value={capResultLabel(suggestion.selected_team.payroll.current_cap_result)} tone={suggestion.selected_team.cap_legality.eligible ? "positive" : "danger"} />
            <PackageMetric label="Partner response" value={suggestion.counterparty_team.acceptance.reason} tone={suggestion.counterparty_team.acceptance.status === "positive" ? "positive" : "neutral"} />
          </div>
        </>
      )}

      {!legalAsProposed && (
        <div className="border-t border-slate-200 bg-blue-50/50 p-4 dark:border-slate-700 dark:bg-blue-950/10">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">Choose how to complete the trade</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">These are alternatives, not automatic actions. Review one before proposing the trade.</p>
          </div>
          {hasCompletion ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <CompletionGroup title="Drop after trade" helper="The overflowing team releases one player." options={drops} />
              <CompletionGroup title="Expand to 2-for-2" helper="Add one more player to the outgoing package." options={expansions} />
            </div>
          ) : (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">No legal drop or expanded-package completion was found.</p>
          )}
        </div>
      )}
    </article>
  );
}

function effectivePackageTier(suggestion: AutomaticTradePackageSuggestion): AutomaticTradePackageSuggestion["recommendation_tier"] {
  if (suggestion.completion_status === "legal_as_proposed") return suggestion.recommendation_tier;
  const completionTiers = [
    ...suggestion.completion_options.drop_candidates,
    ...suggestion.completion_options.expanded_packages,
  ].map((option) => option.recommendation_tier);
  if (completionTiers.includes("proposable")) return "proposable";
  if (completionTiers.includes("exploratory")) return "exploratory";
  return "not_recommended";
}

function effectiveProductionValue(suggestion: AutomaticTradePackageSuggestion): TradePackageProductionValue {
  return suggestion.best_completion?.production_value ?? suggestion.production_value;
}


function ProductionValuePanel({ value, usesCompletion, picksAssessed = false }: { value: TradePackageProductionValue; usesCompletion: boolean; picksAssessed?: boolean }) {
  const yourRatio = retainedValuePercent(value.selected_team.retained_ratio);
  const partnerRatio = retainedValuePercent(value.counterparty_team.retained_ratio);
  const gap = Math.max(
    value.selected_team.value_gap_to_balanced ?? 0,
    value.counterparty_team.value_gap_to_balanced ?? 0,
  );
  const presentation = value.classification === "balanced"
    ? {
      title: "Balanced player value",
      detail: "Both teams retain at least 85% of the production value they send.",
      classes: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-200",
    }
    : value.classification === "materially_equivalent"
      ? {
        title: "Roster-boundary comparison",
        detail: "Both packages are at or below the production level around the league's final normal roster spots. Keep this as context, not as a balanced recommendation.",
        classes: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-200",
      }
      : value.classification === "uneven"
      ? {
        title: "Additional asset compensation required",
        detail: "The player return is somewhat uneven. A useful pick or another asset may bridge the gap, especially in an offseason cap-relief deal.",
        classes: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200",
      }
      : value.classification === "severely_uneven"
        ? {
          title: "Major player-value gap",
          detail: "Do not treat this player-only package as balanced. It needs substantial additional compensation.",
          classes: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/25 dark:text-red-200",
        }
        : {
          title: "Player value unavailable",
          detail: "The analyzer could not establish a trusted roster-boundary comparison, so this package cannot be called proposable.",
          classes: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
        };
  return (
    <div className={`mx-4 mb-4 rounded-xl border p-4 ${presentation.classes}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]">Production-value check{usesCompletion ? " · best legal completion" : ""}{picksAssessed ? " · picks excluded" : ""}</p>
          <h4 className="mt-1 font-black">{presentation.title}</h4>
          <p className="mt-1 max-w-3xl text-sm opacity-90">{presentation.detail}</p>
        </div>
        {yourRatio != null && <span className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-black tabular-nums dark:bg-slate-950/40">You receive {yourRatio}% of sent value</span>}
      </div>
      <details className="mt-3 border-t border-current/20 pt-2">
        <summary className="cursor-pointer text-xs font-bold">How is player value calculated?</summary>
        {partnerRatio != null && (
          <p className="mt-3 text-xs font-semibold opacity-80">Partner receives {partnerRatio}% of the value they send.</p>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ValueExchange label="Your team" value={value.selected_team} />
          <ValueExchange label="Partner team" value={value.counterparty_team} />
        </div>
        {value.baseline_kind === "marginal_roster" && (
          <p className="mt-3 text-[11px] font-semibold opacity-75">
            Baseline: production around the league&apos;s marginal normal roster slot{value.baseline_impact != null ? ` (${formatValueScore(value.baseline_impact)})` : ""}. Salary, free-agent access and token cost are assessed separately.
          </p>
        )}
      </details>
      {value.compensation_required && (
        <p className="mt-3 text-xs font-bold">
          {picksAssessed ? "Pick value is assessed separately below and does not alter this player-value result" : "Unpriced picks are not counted yet"}{gap > 0 ? ` · estimated production gap to the balanced threshold: ${formatValueScore(gap)}` : ""}.
        </p>
      )}
    </div>
  );
}

function productionValueSummary(value: TradePackageProductionValue): string {
  switch (value.classification) {
    case "balanced": return "balanced";
    case "materially_equivalent": return "roster-boundary comparison";
    case "uneven": return "extra compensation needed";
    case "severely_uneven": return "major gap";
    default: return "unavailable";
  }
}

function acquisitionSummary(context: TradeAcquisitionContext): string {
  switch (context.status) {
    case "tokens_required": return "Tokens required";
    case "free_agency_closed": return "Free agency closed";
    case "free_agency_open_cap_not_enforced": return "Free agency open · cap later";
    case "free_agency_open_cap_enforced": return "Free agency open · cap active";
    default: return "Acquisition rules need review";
  }
}



export function ExactPackageResult({ payload, league, onAnalyzeExpandedPickPackage }: {
  payload: FantasyTradePackageAnalysis;
  league: LeagueSlug;
  onAnalyzeExpandedPickPackage: (original: FantasyTradePackageAnalysis, option: TradePackageCompletionOption) => void;
}) {
  if (payload.analysis_scope === "pick_for_player_context") {
    return <PickForPlayerResult payload={payload} league={league} onAnalyzeExpandedPickPackage={onAnalyzeExpandedPickPackage} />;
  }
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-900 dark:bg-slate-900">
      <div className="border-b border-blue-100 p-5 dark:border-blue-900/60">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Exact package result</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Exact trade package</h2>
        <p className="mt-1 text-sm text-slate-500">Roster, cap and categories reflect the full package. Player value and pick value are assessed separately.</p>
      </div>
      <div className="p-4">
        {payload.package.counterparty_team_sends.map((player) => (
          <TradeDecisionComparison
            key={player.nba_id}
            league={league}
            player={player}
            modelFit={`Category fit ${formatSigned(payload.selected_team.category_score.score)}`}
            categoryChanges={payload.selected_team.category_changes}
            explanation={payload.decision_explanation}
            capStatus={capResultLabel(payload.selected_team.payroll.current_cap_result)}
          />
        ))}
        <OneForTwoSuggestionCard
          suggestion={payload}
          rank={1}
          league={league}
          assets={payload.package.assets}
          picksAssessed={payload.package.assets.length > 0}
          showStrategyImpact={false}
          exactContext={{ acquisition: payload.acquisition_context, strategy: payload.strategy }}
        />
        <div className="mt-4">
          <TradePlayerResearchPanel
            league={league}
            players={payload.package.counterparty_team_sends}
          />
        </div>
        {payload.package.assets.length > 0 && <PickValuePanel payload={payload} />}
      </div>
      <MethodNote>Manual exact package · 1–2 players per side · up to two canonical picks per side · no automatic transfer · pick value never changes the recommendation tier.</MethodNote>
    </section>
  );
}

function PickForPlayerResult({ payload, league, onAnalyzeExpandedPickPackage }: {
  payload: FantasyTradePackageAnalysis;
  league: LeagueSlug;
  onAnalyzeExpandedPickPackage: (original: FantasyTradePackageAnalysis, option: TradePackageCompletionOption) => void;
}) {
  const player = payload.package.counterparty_team_sends[0];
  const sentPicks = payload.package.assets.filter((asset) => asset.from_team === "selected_team");
  const selectedRoster = payload.selected_team.roster_slots;
  const partnerRoster = payload.counterparty_team.roster_slots;
  const completionOptions = [
    ...payload.completion_options.drop_candidates,
    ...payload.completion_options.expanded_packages,
  ];
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-900 dark:bg-slate-900">
      <div className="border-b border-blue-100 p-5 dark:border-blue-900/60">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Pick-for-player decision brief</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">What changes if you trade these picks for {player?.name ?? "this player"}?</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Salary, categories and roster slots are simulated for both teams. Pick value is an indicative range, not a combined fairness score or trade recommendation.</p>
      </div>
      <AcquisitionContextPanel context={payload.acquisition_context} />
      <div className="space-y-4 p-4">
        {player?.nba_id && !payload.decision_explanation && <ReviewedInjuryNotice league={league} nbaId={player.nba_id} />}
        {player?.nba_id && payload.decision_explanation && <div className="-mx-4">
          <TradeDecisionComparison
            league={league}
            player={player}
            modelFit={`Category fit ${formatSigned(payload.selected_team.category_score.score)}`}
            categoryChanges={payload.selected_team.category_changes}
            explanation={payload.decision_explanation}
            capStatus={capResultLabel(payload.selected_team.payroll.current_cap_result)}
          />
        </div>}
        {payload.completion_status !== "legal_as_proposed" && payload.completion_status !== "legal_with_drop" && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Provisional analysis: salary and categories below show the pick-only trade as entered, before any roster-completion move. They are not the final completed-trade result.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">You send</p>
            {sentPicks.map((pick) => (
              <p key={pick.pick_id} className="mt-2 font-bold text-slate-900 dark:text-white">
                {pick.draft_year} Round {pick.round} · originally {pick.original_franchise?.name ?? "unknown"}
              </p>
            ))}
            {payload.package.drops.selected_team && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Roster completion: drop {payload.package.drops.selected_team.name} (not sent to the partner).</p>}
          </div>
          <PackageSide title="You receive" players={payload.package.counterparty_team_sends} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <PackageMetric label="Your cap" value={capResultLabel(payload.selected_team.payroll.current_cap_result)} tone={payload.selected_team.cap_legality.eligible ? "positive" : "danger"} />
          <PackageMetric label="Partner cap" value={capResultLabel(payload.counterparty_team.payroll.current_cap_result)} tone={payload.counterparty_team.cap_legality.eligible ? "positive" : "danger"} />
          <PackageMetric label="Roster status" value={payload.completion_status === "legal_as_proposed" ? "Legal as entered" : payload.completion_status === "legal_with_drop" ? "Legal with your drop" : "Needs review or completion"} tone={payload.completion_status === "legal_as_proposed" || payload.completion_status === "legal_with_drop" ? "positive" : "danger"} />
        </div>
        <p className="text-xs text-slate-500">Roster slots: you {selectedRoster.before} → {selectedRoster.after}; partner {partnerRoster.before} → {partnerRoster.after}. A proposed drop is only simulated, never applied automatically.</p>
        {payload.completion_status !== "legal_as_proposed" && payload.completion_status !== "legal_with_drop" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <h3 className="font-black text-amber-900 dark:text-amber-200">Review how to complete the roster</h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">The package is not confirmed legal as entered. Review the roster and cap result before proposing it.</p>
            {completionOptions.length > 0 && (
              <div className="mt-3 space-y-2">
                {completionOptions.map((option) => (
                  <div key={`${option.type}-${option.player.nba_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <span>{option.type === "drop" ? `Drop ${option.player.name} after the trade` : `Add ${option.player.name} to the trade (no longer pick-only)`} · {option.completion_status.replaceAll("_", " ")}</span>
                    {option.type === "expanded_package" && option.team === "selected_team" && option.completion_status === "legal_as_expanded_package" && (
                      <button type="button" onClick={() => onAnalyzeExpandedPickPackage(payload, option)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
                        Recalculate completed trade
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <ManualTradeCategoryImpact changes={payload.selected_team.category_changes} strategy={payload.strategy} />
        <TradePlayerResearchPanel league={league} players={payload.package.counterparty_team_sends} />
        <details className="rounded-xl border border-slate-200 dark:border-slate-700">
          <summary className="cursor-pointer p-4 font-black text-slate-900 dark:text-white">Five-year payroll detail</summary>
          <div className="p-4 pt-0"><PayrollComparison selected={payload.selected_team} counterparty={payload.counterparty_team} /></div>
        </details>
        <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <summary className="cursor-pointer font-black text-slate-900 dark:text-white">Partner category impact</summary>
          <p className="mt-2 text-xs text-slate-500">These changes reflect the player leaving the partner. The pick&apos;s future value does not affect current-season category rankings.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {payload.counterparty_team.category_changes.map((change) => (
              <p key={change.key} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <strong>{change.label}</strong> · #{formatRank(change.before.league_rank)} → #{formatRank(change.after.league_rank)} · {change.z_delta == null ? "—" : `${formatSigned(change.z_delta)}z`}
              </p>
            ))}
          </div>
        </details>
        <PickValuePanel payload={payload} contextOnly />
      </div>
      <MethodNote>Decision support only · one incoming player for one or two canonical picks · no automatic transfer or drop · no overall trade-value grade.</MethodNote>
    </section>
  );
}

function ManualTradeCategoryImpact({
  changes,
  strategy,
}: {
  changes: TradeCategoryChange[];
  strategy?: TradeCategoryStrategyContext;
}) {
  const finiteDeltas = changes
    .map((change) => change.z_delta)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const maximumDelta = Math.max(0, ...finiteDeltas.map((value) => Math.abs(value)));
  const scaleCeiling = Math.max(0.5, Math.ceil(maximumDelta * 2) / 2);
  const improving = changes.filter((change) => ["weakness_resolved", "improved"].includes(change.transition)).length;
  const declining = changes.filter((change) => ["new_weakness", "declined"].includes(change.transition)).length;
  const stable = changes.length - improving - declining;
  const meaningful = changes
    .filter((change) => ["weakness_resolved", "improved", "new_weakness", "declined"].includes(change.transition))
    .sort((left, right) => Math.abs(right.z_delta ?? 0) - Math.abs(left.z_delta ?? 0));

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-labelledby="manual-category-impact-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Your team · category impact</p>
          <h3 id="manual-category-impact-title" className="mt-1 text-lg font-black text-slate-950 dark:text-white">What changes in your categories?</h3>
          <p className="mt-1 text-xs text-slate-500">Largest meaningful swings first · rank before → after</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-500">
          <span><strong className="text-emerald-600 dark:text-emerald-400">{improving}</strong> meaningful gains</span>
          <span><strong className="text-red-600 dark:text-red-400">{declining}</strong> meaningful declines</span>
          <span><strong className="text-slate-700 dark:text-slate-200">{stable}</strong> without meaningful change</span>
        </div>
      </div>

      <StrategyImpactPanel strategy={strategy} changes={changes} />

      <div className="grid gap-x-6 px-4 py-2 xl:grid-cols-2">
        {meaningful.map((change) => (
          <CategoryImpactBar key={change.key} change={change} scaleCeiling={scaleCeiling} />
        ))}
        {meaningful.length === 0 && <p className="py-3 text-sm text-slate-500">No meaningful category swing in this simulation.</p>}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
        <details>
          <summary className="cursor-pointer font-bold text-blue-700 dark:text-blue-300">Show all {changes.length} categories and smaller changes</summary>
          <div className="mt-3 grid gap-x-6 xl:grid-cols-2">
            {changes.map((change) => <CategoryImpactBar key={change.key} change={change} scaleCeiling={scaleCeiling} />)}
          </div>
        </details>
        <p className="mt-2">Positive means improvement relative to the league; negative means decline. These are not percentages or probabilities.</p>
        <details className="mt-2">
          <summary className="cursor-pointer font-bold text-blue-700 dark:text-blue-300">What does the z-score change mean? See an example</summary>
          <div className="mt-2 space-y-1 rounded-lg bg-white p-3 dark:bg-slate-900">
            <p>If FG% moves from z-score −0.30 to +0.28, the displayed change is <strong>+0.58z</strong>. Your team moved from below the league average to above it.</p>
            <p>The rank beside it makes that technical value concrete: for example, <strong>#12 → #7</strong>.</p>
            <p>Turnovers are already direction-adjusted, so a positive change means fewer turnovers and therefore a better result.</p>
          </div>
        </details>
        <p className="mt-2 text-[10px] text-slate-400">Shared chart scale: ±{scaleCeiling.toFixed(1)}z. Exact values remain visible for comparison.</p>
      </div>
    </section>
  );
}

function CategoryImpactBar({ change, scaleCeiling }: {
  change: TradeCategoryChange;
  scaleCeiling: number;
}) {
  const delta = change.z_delta;
  const positive = ["weakness_resolved", "improved"].includes(change.transition);
  const negative = ["new_weakness", "declined"].includes(change.transition);
  const barWidth = delta == null ? 0 : Math.min(Math.abs(delta) / scaleCeiling, 1) * 50;
  const tone = positive
    ? "bg-emerald-500"
    : negative
      ? "bg-red-500"
      : "bg-slate-500";
  const valueTone = positive
    ? "text-emerald-600 dark:text-emerald-400"
    : negative
      ? "text-red-600 dark:text-red-400"
      : "text-slate-500";
  const direction = positive ? "improves" : negative ? "declines" : "is stable";
  const deltaLabel = delta == null ? "—" : `${formatSigned(delta)}z`;

  return (
    <div className="grid min-h-14 grid-cols-[42px_92px_minmax(70px,1fr)_58px] items-center gap-2 border-b border-slate-100 py-2 dark:border-slate-800" aria-label={`${change.label}: rank ${formatRank(change.before.league_rank)} to ${formatRank(change.after.league_rank)}, ${direction}, ${deltaLabel}`}>
      <span className="text-xs font-black text-slate-800 dark:text-slate-100">{change.label}</span>
      <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">#{formatRank(change.before.league_rank)} → <strong className="text-slate-800 dark:text-slate-100">#{formatRank(change.after.league_rank)}</strong></span>
      <span className="relative h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
        <span className="absolute inset-y-0 left-1/2 w-px bg-slate-400 dark:bg-slate-500" />
        {delta != null && delta !== 0 && (
          <span
            className={`absolute inset-y-0 rounded-full ${tone} ${delta > 0 ? "left-1/2" : "right-1/2"}`}
            style={{ width: `${barWidth}%` }}
          />
        )}
        {delta === 0 && <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-slate-500" />}
      </span>
      <strong className={`text-right text-xs tabular-nums ${valueTone}`}>{deltaLabel}</strong>
    </div>
  );
}

function PickValuePanel({ payload, contextOnly = false }: { payload: FantasyTradePackageAnalysis; contextOnly?: boolean }) {
  const assets = payload.package.assets;
  const pickValue = payload.pick_value;
  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Canonical pick compensation</p>
          <h3 className="mt-1 font-black text-slate-950 dark:text-white">{assets.length ? `${assets.length} pick${assets.length === 1 ? "" : "s"} assessed` : "No picks included"}</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase text-violet-700 dark:bg-slate-900 dark:text-violet-300">Shadow value only</span>
      </div>
      {assets.length > 0 && pickValue && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <PickSideAssessment title="Your team receives" side={pickValue.selected_team} showSufficiency={!contextOnly} />
          <PickSideAssessment title="Partner receives" side={pickValue.counterparty_team} showSufficiency={!contextOnly} />
        </div>
      )}
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{contextOnly
        ? "Picks are verified against their canonical current owner. Their range is only context: it does not prove the player-for-pick exchange is fair, and no asset is transferred."
        : "Picks are read from the canonical ledger and checked against their mapped current owner. This analysis neither transfers them nor silently turns an exploratory player package into a proposable one."}</p>
    </div>
  );
}

function PickSideAssessment({ title, side, showSufficiency = true }: { title: string; side: NonNullable<FantasyTradePackageAnalysis["pick_value"]>["selected_team"]; showSufficiency?: boolean }) {
  const band = side.combined_valuation?.compensation_band;
  const sufficiency = side.assessment?.sufficiency;
  return (
    <div className="rounded-lg border border-violet-100 bg-white p-3 dark:border-violet-900 dark:bg-slate-900">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-1 font-black text-slate-950 dark:text-white">
        {band ? (band.conservative === band.optimistic ? band.conservative : `${band.conservative} → ${band.optimistic}`).replaceAll("_", " ") : "No valued pick received"}
      </p>
      {showSufficiency && sufficiency && <p className="mt-1 text-xs font-semibold text-violet-700 dark:text-violet-300">{sufficiency.replaceAll("_", " ")}</p>}
      {side.incoming_assets.map((asset) => (
        <p key={asset.pick_id} className="mt-2 text-xs text-slate-500">{asset.draft_year} Round {asset.round} · originally {asset.original_franchise?.name ?? "unknown"}</p>
      ))}
    </div>
  );
}

function ValueExchange({ label, value }: { label: string; value: TradePackageProductionValue["selected_team"] }) {
  return (
    <div className="rounded-lg bg-white/65 px-3 py-2 text-xs dark:bg-slate-950/30">
      <p className="font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 font-black tabular-nums">Sends {formatValueScore(value.sent)} · receives {formatValueScore(value.received)}</p>
    </div>
  );
}

function formatValueScore(value: number | null): string {
  return value == null ? "—" : value.toFixed(2);
}


function PackageSide({ title, players, picks = [] }: {
  title: string;
  players: TradePlayerSummary[];
  picks?: FantasyTradePackageAnalysis["package"]["assets"];
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {players.map((player) => <PackagePlayer key={player.nba_id} player={player} />)}
        {picks.map((pick) => (
          <div key={pick.pick_id} className="rounded-lg bg-violet-50 p-2.5 text-sm font-bold text-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
            Draft pick · {pick.draft_year} Round {pick.round} · originally {pick.original_franchise?.name ?? "unknown"}
          </div>
        ))}
      </div>
    </div>
  );
}

function PackagePlayer({ player }: { player: TradePlayerSummary }) {
  const photo = photoUrl(null, player.nba_id);
  const salary = player.salaries["2026-27"] ?? player.salaries["2026_27"] ?? null;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        {photo ? <Image src={photo} alt={player.name} fill className="object-cover" unoptimized /> : <span className="flex h-full items-center justify-center font-bold text-slate-400">{player.name[0]}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950 dark:text-white">{player.name}</p>
        <p className="truncate text-xs text-slate-500">{[player.nba_team, player.position].filter(Boolean).join(" · ")}</p>
      </div>
      <p className="text-xs font-bold tabular-nums text-blue-700 dark:text-blue-300">{salary == null ? "$0" : formatMoney(salary)}</p>
    </div>
  );
}

function CompletionGroup({ title, helper, options }: { title: string; helper: string; options: TradePackageCompletionOption[] }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-white p-3 dark:border-blue-900 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-black text-slate-950 dark:text-white">{title}</h4>
          <p className="text-xs text-slate-500">{helper}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{options.length} option{options.length === 1 ? "" : "s"}</span>
      </div>
      {options.length ? (
        <div className="mt-3 space-y-2">
          {options.map((option) => (
            <div key={`${option.type}-${option.player.nba_id}`} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{option.player.name}</p>
                  <p className="text-xs text-slate-500">{option.team === "selected_team" ? "Your team" : "Partner team"} · fit {formatSigned(option.selected_category_score.score)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    {option.type === "drop" ? `Production value lost ${formatValueScore(option.marginal_value_lost)}` : "Added to the trade package"}
                    {option.production_value.selected_team.retained_ratio != null ? ` · you receive ${retainedValuePercent(option.production_value.selected_team.retained_ratio)}% of sent value` : ""}
                    {option.production_value.counterparty_team.retained_ratio != null ? ` · partner receives ${retainedValuePercent(option.production_value.counterparty_team.retained_ratio)}%` : ""}
                  </p>
                </div>
                <TierBadge tier={option.recommendation_tier} compact />
              </div>
            </div>
          ))}
        </div>
      ) : <p className="mt-3 text-xs text-slate-400">No legal options found.</p>}
    </div>
  );
}

function PackageMetric({ label, value, tone }: { label: string; value: string; tone: "positive" | "danger" | "neutral" }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-black ${tone === "positive" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : "text-slate-700 dark:text-slate-200"}`}>{value}</p>
    </div>
  );
}

function TierBadge({ tier, compact = false }: { tier: AutomaticTradePackageSuggestion["recommendation_tier"] | TradePackageCompletionOption["recommendation_tier"]; compact?: boolean }) {
  const positive = tier === "proposable";
  return <span className={`rounded-full font-bold uppercase ${compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-xs"} ${positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : tier === "exploratory" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{positive ? "Passes model checks" : tier.replace("_", " ")}</span>;
}

function OneForTwoEmptyState({ payload }: { payload: FantasyAutomaticTradePackageSuggestions }) {
  const diagnostics = Object.entries(payload.summary.diagnostics).filter(([, count]) => count > 0);
  return (
    <div className="m-4 rounded-xl border border-dashed border-slate-300 p-6 dark:border-slate-700">
      <h3 className="font-black text-slate-950 dark:text-white">No balanced one-for-two suggestions</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No exact package survived the current category, cap, and roster rules. Constraints were not relaxed automatically.</p>
      {diagnostics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {diagnostics.map(([key, count]) => <span key={key} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{key.replaceAll("_", " ")}: {count}</span>)}
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">{payload.summary.screened_pairs} candidate pairs screened; try manual package analysis when you have a specific structure in mind.</p>
    </div>
  );
}
