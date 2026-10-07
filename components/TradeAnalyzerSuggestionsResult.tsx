"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import { basisLabel, ChipList, ConfidenceBadge, FallbackBanner, formatSigned, MethodNote } from "@/components/TradeAnalyzerShared";
import { AcquisitionContextPanel, formatMoney, formatSignedMoney, oneForOneValueVerdict, retainedValuePercent, StrategyImpactPanel } from "@/components/TradeAnalyzerViewShared";
import { photoUrl, type BalancedTradeSuggestion, type FantasyBalancedTradeSuggestions, type TradeSuggestionPickCompensation, type TradeSuggestionPickOption } from "@/lib/api";

type RecommendationFilter = "all" | "proposable" | "exploratory";
type PickGuidanceFilter = "all" | "receive" | "send" | "not_required" | "unavailable";
type CapStatusFilter = "all" | "compliant" | "plan_required" | "not_eligible";
type ClosestAlternatives = NonNullable<FantasyBalancedTradeSuggestions["closest_alternatives"]>;
export type ClosestAlternative = ClosestAlternatives["items"][number];

function interleaveTeamSuggestions(teams: FantasyBalancedTradeSuggestions["teams"]): BalancedTradeSuggestion[] {
  const ordered: BalancedTradeSuggestion[] = [];
  const longestTeamList = Math.max(0, ...teams.map((group) => group.suggestions.length));
  for (let rank = 0; rank < longestTeamList; rank += 1) {
    for (const group of teams) {
      const suggestion = group.suggestions[rank];
      if (suggestion) ordered.push(suggestion);
    }
  }
  return ordered;
}

export function BalancedSuggestionsResult({ payload, onAnalyze, onBuildPackage }: {
  payload: FantasyBalancedTradeSuggestions;
  onAnalyze: (suggestion: BalancedTradeSuggestion) => void;
  onBuildPackage: (
    alternative: ClosestAlternative,
    suggestion: BalancedTradeSuggestion,
  ) => void;
}) {
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>("all");
  const [pickFilter, setPickFilter] = useState<PickGuidanceFilter>("all");
  const [capFilter, setCapFilter] = useState<CapStatusFilter>("all");
  const [highlightedCandidate, setHighlightedCandidate] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(5);
  const returnedSuggestions = useMemo(
    () => payload.teams.flatMap((group) => group.suggestions),
    [payload.teams],
  );
  const pickCounts = useMemo(
    () => countSuggestionCategories(returnedSuggestions, pickGuidanceCategory),
    [returnedSuggestions],
  );
  const capCounts = useMemo(
    () => countSuggestionCategories(returnedSuggestions, capStatusCategory),
    [returnedSuggestions],
  );
  const filteredTeams = useMemo(
    () => payload.teams
      .map((group) => ({
        ...group,
        suggestions: group.suggestions.filter((suggestion) => (
          (recommendationFilter === "all" || suggestion.suggestion_tier === recommendationFilter)
          && (pickFilter === "all" || pickGuidanceCategory(suggestion) === pickFilter)
          && (capFilter === "all" || capStatusCategory(suggestion) === capFilter)
        )),
      }))
      .filter((group) => group.suggestions.length > 0),
    [capFilter, payload.teams, pickFilter, recommendationFilter],
  );
  const orderedSuggestions = useMemo(() => interleaveTeamSuggestions(filteredTeams), [filteredTeams]);
  const matchingCount = orderedSuggestions.length;
  const shownCount = Math.min(visibleLimit, matchingCount);
  const displayedSuggestions = orderedSuggestions.slice(0, shownCount);
  const filtersActive = recommendationFilter !== "all" || pickFilter !== "all" || capFilter !== "all";
  const gateCounts = payload.diagnostics.strict_gate_counts;
  const closestAlternatives = payload.closest_alternatives;

  useEffect(() => {
    if (!highlightedCandidate) return;
    document.getElementById(`trade-suggestion-${highlightedCandidate}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [highlightedCandidate, visibleLimit, recommendationFilter, pickFilter, capFilter]);

  function resetVisibleSuggestions() {
    setVisibleLimit(5);
    setHighlightedCandidate(null);
  }

  function focusAlternative(counterpartyTeamId: string, incomingNbaId: number | null) {
    const key = suggestionCandidateKey(counterpartyTeamId, incomingNbaId);
    setRecommendationFilter("all");
    setPickFilter("all");
    setCapFilter("all");
    const candidateIndex = interleaveTeamSuggestions(payload.teams).findIndex((suggestion) => (
      suggestionCandidateKey(suggestion.trade.counterparty_team_id, suggestion.trade.incoming.nba_id) === key
    ));
    if (candidateIndex >= 0) setVisibleLimit(Math.max(5, candidateIndex + 1));
    setHighlightedCandidate(key);
  }

  function clearFilters() {
    setRecommendationFilter("all");
    setPickFilter("all");
    setCapFilter("all");
    resetVisibleSuggestions();
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-5 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Balanced trade market</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Returns for {payload.outgoing.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payload.counts.returned} suggestions returned · {payload.teams.length} teams · {basisLabel(payload.basis_used)}
            </p>
          </div>
          <div className="text-right">
            <div className="flex flex-wrap justify-end gap-2 text-xs font-bold">
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{payload.counts.proposable} pass all model checks</span>
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">{payload.counts.exploratory} exploratory candidates</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Candidate counts cover the full market scan; cards show the top returned results.</p>
          </div>
        </div>
      </div>
      {payload.fallback_reason && <FallbackBanner />}
      <AcquisitionContextPanel context={payload.acquisition_context} />
      {gateCounts && gateCounts.eligible_after_hard_filters > 0 && (
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Model qualification checks</p>
          <p className="mt-1 text-xs text-slate-500">Each count is measured independently across {gateCounts.eligible_after_hard_filters} cap-legal pairs.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <GateCount label="Helps or preserves your categories" passed={gateCounts.selected_team_category_fit} total={gateCounts.eligible_after_hard_filters} />
            <GateCount label="Partner has positive incentive" passed={gateCounts.counterparty_acceptance} total={gateCounts.eligible_after_hard_filters} />
            <GateCount label="Production value is balanced" passed={gateCounts.production_value_balance} total={gateCounts.eligible_after_hard_filters} />
            <GateCount label="Passes all three" passed={gateCounts.all_strict_gates} total={gateCounts.eligible_after_hard_filters} emphasized />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Passing these checks is not a trade recommendation or a prediction that the other manager will accept.</p>
        </div>
      )}
      {payload.counts.proposable === 0 && closestAlternatives && closestAlternatives.returned > 0 && (
        <ClosestAlternativesPanel
          alternatives={closestAlternatives}
          gateCounts={gateCounts}
          suggestions={returnedSuggestions}
          onView={focusAlternative}
          onBuildPackage={onBuildPackage}
        />
      )}
      {payload.teams.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Filter returned suggestions</p>
              <p className="mt-1 text-xs text-slate-500">
                Showing {shownCount} of {matchingCount} matching suggestions · {returnedSuggestions.length} returned in total
              </p>
            </div>
            {filtersActive && (
              <button type="button" onClick={clearFilters} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                Clear filters
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <SuggestionFilterGroup
              label="Recommendation"
              value={recommendationFilter}
              onChange={(value) => { setRecommendationFilter(value); resetVisibleSuggestions(); }}
              options={[
                { value: "all", label: "All", count: returnedSuggestions.length },
                { value: "proposable", label: "Passes model checks", count: returnedSuggestions.filter((suggestion) => suggestion.suggestion_tier === "proposable").length },
                { value: "exploratory", label: "Exploratory", count: returnedSuggestions.filter((suggestion) => suggestion.suggestion_tier === "exploratory").length },
              ]}
            />
            <SuggestionFilterGroup
              label="Pick guidance"
              value={pickFilter}
              onChange={(value) => { setPickFilter(value); resetVisibleSuggestions(); }}
              options={[
                { value: "all", label: "All", count: returnedSuggestions.length },
                { value: "receive", label: "You receive", count: pickCounts.receive ?? 0 },
                { value: "send", label: "You send", count: pickCounts.send ?? 0 },
                { value: "not_required", label: "No pick", count: pickCounts.not_required ?? 0 },
                { value: "unavailable", label: "Unavailable", count: pickCounts.unavailable ?? 0 },
              ]}
            />
            <SuggestionFilterGroup
              label="Your cap status"
              value={capFilter}
              onChange={(value) => { setCapFilter(value); resetVisibleSuggestions(); }}
              options={[
                { value: "all", label: "All", count: returnedSuggestions.length },
                { value: "compliant", label: "Compliant now", count: capCounts.compliant ?? 0 },
                { value: "plan_required", label: "October plan", count: capCounts.plan_required ?? 0 },
                ...(capCounts.not_eligible ? [{ value: "not_eligible" as const, label: "Not eligible", count: capCounts.not_eligible }] : []),
              ]}
            />
          </div>
          <p className="mt-3 text-[10px] text-slate-400">Filters apply only to the cards returned by the backend; they do not change the market scan, ranking, or recommendation tier.</p>
        </div>
      )}
      {payload.teams.length && displayedSuggestions.length ? (
        <div className="p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedSuggestions.map((suggestion) => (
              <SuggestionCard
                key={`${suggestion.trade.counterparty_team_id}-${suggestion.trade.incoming.nba_id}`}
                league={payload.league.slug}
                suggestion={suggestion}
                highlighted={highlightedCandidate === suggestionCandidateKey(
                  suggestion.trade.counterparty_team_id,
                  suggestion.trade.incoming.nba_id,
                )}
                onAnalyze={() => onAnalyze(suggestion)}
              />
            ))}
          </div>
          {shownCount < matchingCount && (
            <div className="mt-5 border-t border-slate-200 pt-5 text-center dark:border-slate-700">
              <button
                type="button"
                onClick={() => { setVisibleLimit((limit) => limit + 5); setHighlightedCandidate(null); }}
                className="rounded-xl border border-blue-400 px-5 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                Show next {Math.min(5, matchingCount - shownCount)} suggestions
              </button>
              <p className="mt-2 text-xs text-slate-500">One suggestion per team first; the rest remain available here.</p>
            </div>
          )}
        </div>
      ) : payload.teams.length ? (
        <div className="m-4 rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <h3 className="font-black text-slate-950 dark:text-white">No returned suggestions match these filters</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The underlying market results are unchanged. Clear or adjust the filters to show the cards again.</p>
          <button type="button" onClick={clearFilters} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Clear filters</button>
        </div>
      ) : <SuggestionEmptyState payload={payload} />}
      <MethodNote>Value-aware one-for-one search · offseason cap obligations remain warnings until October · in-season cap rules stay hard · shadow pick possibilities never change ranking or recommendation tier.</MethodNote>
    </section>
  );
}

function SuggestionFilterGroup<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; count: number }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition ${value === option.value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}
          >
            {option.label} <span className={value === option.value ? "text-blue-100" : "text-slate-400"}>{option.count}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function countSuggestionCategories<T extends string>(
  suggestions: BalancedTradeSuggestion[],
  category: (suggestion: BalancedTradeSuggestion) => T,
): Partial<Record<T, number>> {
  return suggestions.reduce<Partial<Record<T, number>>>((counts, suggestion) => {
    const key = category(suggestion);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function pickGuidanceCategory(suggestion: BalancedTradeSuggestion): Exclude<PickGuidanceFilter, "all"> {
  const compensation = suggestion.pick_compensation;
  if (!compensation || compensation.status === "not_required") return "not_required";
  if (compensation.status === "unavailable") return "unavailable";
  if (compensation.direction === "counterparty_to_selected") return "receive";
  if (compensation.direction === "selected_to_counterparty") return "send";
  return "unavailable";
}

function capStatusCategory(suggestion: BalancedTradeSuggestion): Exclude<CapStatusFilter, "all"> {
  const cap = suggestion.cap_legality.selected_team;
  if (cap.compliance_required) return "plan_required";
  return cap.eligible ? "compliant" : "not_eligible";
}

function GateCount({ label, passed, total, emphasized = false }: {
  label: string;
  passed: number;
  total: number;
  emphasized?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${emphasized ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black tabular-nums ${emphasized ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>{passed}<span className="text-xs font-semibold text-slate-400"> / {total}</span></p>
    </div>
  );
}

function suggestionCandidateKey(
  counterpartyTeamId: string,
  incomingNbaId: number | null,
): string {
  return `${counterpartyTeamId}-${incomingNbaId ?? "unknown"}`;
}

export function closestActionText(alternative: ClosestAlternative): string {
  if (alternative.suggested_action.type === "additional_compensation") {
    switch (alternative.suggested_action.pick_guidance) {
      case "possible_options":
        return "Consider an additional player or review the displayed shadow pick options.";
      case "options_below_requirement":
        return "An additional player is likely needed; the displayed shadow pick options do not fully cover the gap.";
      case "unavailable":
        return "Add another player or restructure the package; reliable pick guidance is unavailable.";
      case "not_required":
        return "Add another player or restructure the package; no pick adjustment is indicated for this comparison.";
      case null:
        return "Add another player or restructure the package; no pick guidance is available for this comparison.";
    }
  }

  const messages: Record<ClosestAlternative["suggested_action"]["type"], string> = {
    review_category_tradeoff: "Review the category loss before using this as a starting point.",
    improve_partner_return: "Improve what the partner receives or restructure the return.",
    additional_compensation: "Add another player or restructure the package.",
    restructure_package: "More than one check failed; restructure the package rather than making a small adjustment.",
  };
  return messages[alternative.suggested_action.type];
}

export function closestGateLabel(gate: ClosestAlternative["failed_gates"][number]): string {
  return {
    selected_team_category_fit: "your category fit",
    counterparty_acceptance: "partner incentive",
    production_value_balance: "production value",
  }[gate];
}

function ClosestAlternativesPanel({
  alternatives,
  gateCounts,
  suggestions,
  onView,
  onBuildPackage,
}: {
  alternatives: ClosestAlternatives;
  gateCounts: FantasyBalancedTradeSuggestions["diagnostics"]["strict_gate_counts"];
  suggestions: BalancedTradeSuggestion[];
  onView: (counterpartyTeamId: string, incomingNbaId: number | null) => void;
  onBuildPackage: (
    alternative: ClosestAlternative,
    suggestion: BalancedTradeSuggestion,
  ) => void;
}) {
  const byKey = new Map(suggestions.map((suggestion) => [
    suggestionCandidateKey(
      suggestion.trade.counterparty_team_id,
      suggestion.trade.incoming.nba_id,
    ),
    suggestion,
  ]));
  return (
    <div className="border-b border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">Why no strict match?</p>
      {gateCounts && (
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
          {gateCounts.eligible_after_hard_filters} cap-legal pairs checked. {gateCounts.selected_team_category_fit} helped or preserved your categories, {gateCounts.counterparty_acceptance} gave the partner positive incentive, and {gateCounts.production_value_balance} had balanced production value. None passed all three checks together.
        </p>
      )}
      <h3 className="mt-4 font-black text-slate-950 dark:text-white">Closest alternatives</h3>
      <p className="mt-1 text-xs text-slate-500">These are negotiation starting points, not recommended offers. No threshold was relaxed.</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {alternatives.items.map((alternative) => {
          const key = suggestionCandidateKey(
            alternative.counterparty_team_id,
            alternative.incoming_nba_id,
          );
          const suggestion = byKey.get(key);
          if (!suggestion) return null;
          return (
            <article key={key} className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-slate-950 dark:text-white">{suggestion.trade.incoming.name}</p>
                  <p className="text-xs text-slate-500">{suggestion.counterparty_team.team.name}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  {alternative.classification === "one_check_short" ? "One check short" : "Needs changes"}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-200">Passes {alternative.passed_gate_count}/3 checks</p>
              <p className="mt-1 text-xs text-slate-500">Review: {alternative.failed_gates.map(closestGateLabel).join(" and ")}.</p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{closestActionText(alternative)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onBuildPackage(alternative, suggestion)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700"
                >
                  Build a better package →
                </button>
                <button
                  type="button"
                  onClick={() => onView(
                    alternative.counterparty_team_id,
                    alternative.incoming_nba_id,
                  )}
                  className="text-xs font-black text-blue-700 hover:underline dark:text-blue-300"
                >
                  View result card
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function gateReasonText(reason: string): string {
  const messages: Record<string, string> = {
    selected_team_fit_nonnegative: "The swap helps or preserves your category profile.",
    selected_team_category_tradeoff: "The swap reduces your overall category fit.",
    counterparty_acceptance_positive: "The partner has a positive measured incentive.",
    counterparty_acceptance_neutral: "The partner has no clear measured incentive.",
    counterparty_acceptance_negative: "The partner is projected to lose category utility.",
    counterparty_acceptance_blocked: "The partner is blocked by the current cap rules.",
    production_value_balanced: "Both sides retain the required production value.",
    both_sides_at_or_below_replacement: "Both players are at or below the marginal roster production boundary.",
    replacement_impact_unavailable: "A trusted roster-boundary baseline is unavailable.",
    replacement_value_unavailable: "A trusted roster-boundary baseline is unavailable.",
    production_value_unknown: "Production value could not be verified.",
    two_sided_retained_value_ratio: "At least one side does not retain enough production value.",
  };
  return messages[reason] ?? reason.replaceAll("_", " ");
}

function SuggestionQualification({ suggestion }: { suggestion: BalancedTradeSuggestion }) {
  const qualification = suggestion.qualification;
  if (!qualification) return null;
  const rows = [
    { label: "Your category fit", gate: qualification.gates.selected_team_category_fit },
    { label: "Partner incentive", gate: qualification.gates.counterparty_acceptance },
    { label: "Production value", gate: qualification.gates.production_value_balance },
  ];
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Why this result is classified here</p>
      <div className="mt-2 space-y-2">
        {rows.map(({ label, gate }) => (
          <div key={label} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${gate.passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}>{gate.passed ? "Pass" : "Review"}</span>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">{label}</p>
              <p className="text-slate-500 dark:text-slate-400">{gateReasonText(gate.reason)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({ league, suggestion, highlighted = false, onAnalyze }: {
  league: string;
  suggestion: BalancedTradeSuggestion;
  highlighted?: boolean;
  onAnalyze: () => void;
}) {
  const incoming = suggestion.trade.incoming;
  const photo = photoUrl(null, incoming.nba_id);
  const currentSalary = incoming.salaries["2026-27"];
  const proposable = suggestion.suggestion_tier === "proposable";
  const value = suggestion.production_value;
  const valueVerdict = oneForOneValueVerdict(value);
  const selectedValue = value.selected_team;
  const yourRetainedPercent = retainedValuePercent(selectedValue.retained_ratio);
  const partnerRetainedPercent = retainedValuePercent(value.counterparty_team.retained_ratio);
  const valueGap = selectedValue.value_gap_to_balanced;
  const selectedCap = suggestion.cap_legality.selected_team;
  const amountToClear = selectedCap.amount_to_clear ?? 0;
  const candidateKey = suggestionCandidateKey(
    suggestion.trade.counterparty_team_id,
    suggestion.trade.incoming.nba_id,
  );
  const partner = suggestion.counterparty_team.team;
  return (
    <article
      id={`trade-suggestion-${candidateKey}`}
      className={`flex min-w-0 scroll-mt-24 flex-col rounded-xl border p-4 transition-shadow ${highlighted ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900" : ""} ${proposable ? "border-emerald-200 dark:border-emerald-900" : "border-amber-200 dark:border-amber-900"}`}
    >
      <div className="mb-3 flex min-w-0 items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        <TeamLogo league={league} logo={partner.logo} name={partner.name} size={24} />
        <span className="truncate text-xs font-bold text-slate-600 dark:text-slate-300">{partner.name}</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          {photo ? <Image src={photo} alt={incoming.name} fill className="object-cover" unoptimized /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-black text-slate-950 dark:text-white">{incoming.name}</h4>
          <p className="truncate text-xs text-slate-500">{[incoming.nba_team, incoming.position].filter(Boolean).join(" · ")}</p>
        </div>
        <ConfidenceBadge confidence={suggestion.confidence} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${proposable ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
          {proposable ? "Passes model checks" : "Exploratory"}
        </span>
        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Fit {formatSigned(suggestion.selected_category_score)}</span>
      </div>
      <StrategyImpactPanel
        strategy={suggestion.strategy}
        changes={suggestion.selected_team.category_changes}
        compact
      />
      <SuggestionQualification suggestion={suggestion} />
      <div className={`mt-3 rounded-lg border p-3 ${valueVerdict.box}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-wide ${valueVerdict.text}`}>Player-value check</p>
            <p className={`mt-0.5 text-sm font-black ${valueVerdict.text}`}>{valueVerdict.label}</p>
          </div>
          {yourRetainedPercent != null && (
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${valueVerdict.badge}`}>
              You receive {yourRetainedPercent}%
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{valueVerdict.description}</p>
        {partnerRetainedPercent != null && (
          <p className="mt-2 text-[11px] font-semibold text-slate-500">Partner receives {partnerRetainedPercent}% of the value they send.</p>
        )}
        {valueGap != null && valueGap > 0 && (
          <p className="mt-2 text-[11px] font-semibold text-slate-500">
            Estimated production gap to balanced: {valueGap.toFixed(2)}
          </p>
        )}
      </div>
      {suggestion.pick_compensation && suggestion.pick_compensation.status !== "not_required" && (
        <PickCompensationPanel compensation={suggestion.pick_compensation} />
      )}
      <ChipList label="Helps your team" values={suggestion.outcomes.selected_team.helps} tone="positive" />
      <ChipList label="Trade-offs" values={suggestion.outcomes.selected_team.harms} tone="danger" />
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/70">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">2026–27 salary</span>
          <strong className="tabular-nums text-slate-800 dark:text-slate-100">{currentSalary == null ? "$0" : formatMoney(currentSalary)}</strong>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-slate-500">Your payroll change</span>
          <strong className={`tabular-nums ${suggestion.salary_movement.delta <= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatSignedMoney(suggestion.salary_movement.delta)}</strong>
        </div>
        <p className="mt-2 border-t border-slate-200 pt-2 font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">{suggestion.acceptance.reason}</p>
      </div>
      {selectedCap.compliance_required && amountToClear > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-black">Offseason cap plan required</p>
          <p className="mt-1">Projected {formatMoney(amountToClear)} over the cap after this trade. Clear it before cap activation in October.</p>
        </div>
      ) : selectedCap.cap != null ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Projected cap compliant after this trade.</p>
      ) : null}
      {suggestion.warnings.length > 0 && (
        <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">{suggestion.warnings.length} warning{suggestion.warnings.length === 1 ? "" : "s"} to review</p>
      )}
      <button type="button" onClick={onAnalyze} className="mt-auto pt-4">
        <span className="block rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-black text-white hover:bg-blue-700">Analyze this trade</span>
      </button>
    </article>
  );
}

function PickCompensationPanel({ compensation }: { compensation: TradeSuggestionPickCompensation }) {
  const youReceive = compensation.direction === "counterparty_to_selected";
  const youSend = compensation.direction === "selected_to_counterparty";
  const required = compensation.player_gap?.required_pick_compensation;
  const unavailable = compensation.status === "unavailable";
  const title = youReceive
    ? "You may receive a pick"
    : youSend
      ? "You may need to send a pick"
      : "Pick compensation unavailable";
  const description = youReceive
    ? "You may ask the partner to include one of these picks."
    : youSend
      ? "You may need to include one of your picks for the partner."
      : pickCompensationUnavailableText(compensation.reason);
  const tone = unavailable
    ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
    : youReceive
      ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/25"
      : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25";
  const [primaryOption, ...alternativeOptions] = compensation.candidate_options;

  return (
    <div className={`mt-3 rounded-lg border p-3 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Shadow pick estimate</p>
          <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        {required && (
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
            Target {pickTierLabel(required.conservative)}–{pickTierLabel(required.optimistic)}
          </span>
        )}
      </div>
      {primaryOption && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">Best fit shown</p>
          <PickOptionCard option={primaryOption} />
          {alternativeOptions.length > 0 && (
            <details className="mt-2 rounded-lg border border-white/80 bg-white/40 dark:border-slate-700 dark:bg-slate-900/30">
              <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-blue-700 marker:text-slate-400 dark:text-blue-300">
                Show {alternativeOptions.length} alternative{alternativeOptions.length === 1 ? "" : "s"}
              </summary>
              <div className="space-y-2 border-t border-white/80 p-2 dark:border-slate-700">
                {alternativeOptions.map((option) => <PickOptionCard key={option.id} option={option} />)}
              </div>
            </details>
          )}
          <PickRatingGuide draftPool={primaryOption.valuation.draft_pool} />
        </div>
      )}
      {!unavailable && (
        <p className="mt-2 text-[10px] font-medium text-slate-500">
          Possible negotiation assets only — no pick is added automatically and the card&apos;s tier is unchanged.
        </p>
      )}
    </div>
  );
}

function PickOptionCard({ option }: { option: TradeSuggestionPickOption }) {
  const band = option.valuation.compensation_band;
  const assessment = pickSufficiencyPresentation(option.assessment.sufficiency);
  return (
    <div className="rounded-lg border border-white/80 bg-white/75 p-2.5 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black text-slate-900 dark:text-slate-100">
            {option.draft_year} {draftRoundLabel(option.round)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Originally {option.original_franchise?.name ?? "unknown franchise"}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${assessment.classes}`}>
          {assessment.label}
        </span>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        Conservative {pickTierLabel(band.conservative)} {pickTierSlotBand(band.conservative)} · optimistic {pickTierLabel(band.optimistic)} {pickTierSlotBand(band.optimistic)}
      </p>
    </div>
  );
}

function PickRatingGuide({ draftPool }: { draftPool?: TradeSuggestionPickOption["valuation"]["draft_pool"] }) {
  const poolText = draftPool === "rookie_only"
    ? "This league drafts rookies only."
    : draftPool === "all_available_free_agents"
      ? "This league drafts from all available free agents."
      : null;
  return (
    <details className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
      <summary className="cursor-pointer font-bold text-slate-700 marker:text-slate-400 dark:text-slate-200">What do the pick ratings mean?</summary>
      <div className="mt-2 rounded-lg bg-white/60 p-3 dark:bg-slate-900/40">
        <p>Ratings describe a pick&apos;s nominal position band within this league: Premium #1–4, Strong #5–8, Useful #9–14, Secondary #15–24, Minor #25–32, and Fringe #33–40.</p>
        <p className="mt-1">Conservative is the lower expected value; optimistic is the higher expected value. They are a range, not a guaranteed draft position or an exact player price.</p>
        {poolText && <p className="mt-1">{poolText} Ratings should not be compared directly across leagues.</p>}
      </div>
    </details>
  );
}

function pickTierLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pickTierSlotBand(value: string): string {
  const bands: Record<string, string> = {
    premium: "(#1–4)",
    strong: "(#5–8)",
    useful: "(#9–14)",
    secondary: "(#15–24)",
    minor: "(#25–32)",
    fringe: "(#33–40)",
  };
  return bands[value] ?? "";
}

function draftRoundLabel(round: number): string {
  if (round === 1) return "Round A";
  if (round === 2) return "Round B";
  return `Round ${round}`;
}

function pickSufficiencyPresentation(value: string) {
  if (value === "fully_compensated") return {
    label: "Covers full range",
    classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  };
  if (value === "minimum_compensation_met") return {
    label: "Covers minimum only",
    classes: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  };
  if (value === "plausible_only") return {
    label: "Could work optimistically",
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };
  if (value === "insufficient") return {
    label: "Does not cover gap",
    classes: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  };
  return {
    label: "Unavailable",
    classes: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };
}

function pickCompensationUnavailableText(reason: string): string {
  const messages: Record<string, string> = {
    replacement_impact_unavailable: "A trusted roster-boundary player-value comparison is not available for this result.",
    insufficient_positive_surplus_sample: "The league does not yet have a large enough trusted value sample.",
    franchise_mapping_unavailable: "Team-to-franchise mapping is temporarily unavailable.",
    giving_team_franchise_mapping_missing: "The team that would provide compensation has no verified franchise mapping.",
    draft_asset_inventory_unavailable: "The canonical pick inventory is temporarily unavailable.",
    no_eligible_valued_picks: "The team has no eligible, valued pick that can be shown safely.",
  };
  return messages[reason] ?? "A safe draft-pick estimate cannot be shown for this result.";
}

function SuggestionEmptyState({ payload }: { payload: FantasyBalancedTradeSuggestions }) {
  const missingOutgoingStats = payload.diagnostics.outgoing_player?.blocking_reason
    === "outgoing_player_missing_statistics";
  return (
    <div className="m-4 rounded-xl border border-dashed border-slate-300 p-6 dark:border-slate-700">
      <h3 className="font-black text-slate-950 dark:text-white">{missingOutgoingStats ? "Statistics are not available for this player yet" : "No balanced one-for-one suggestions"}</h3>
      {missingOutgoingStats && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The analyzer cannot compare trade value safely until the outgoing player records games in the selected basis.</p>
      )}
      <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
        {payload.diagnostics.messages.map((message) => <p key={message}>{message}</p>)}
      </div>
      {payload.diagnostics.safe_next_steps.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-blue-700 dark:text-blue-300">
          {payload.diagnostics.safe_next_steps.map((step) => <li key={step.key}>• {step.message}</li>)}
        </ul>
      )}
      <p className="mt-4 text-xs text-slate-500">{payload.diagnostics.candidate_pairs} candidate pairs screened; constraints were not relaxed automatically.</p>
    </div>
  );
}
