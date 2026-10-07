"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SearchablePlayerPicker, {
  type SearchablePlayerOption,
} from "@/components/SearchablePlayerPicker";
import TradeAnalyzerDestinationResult from "@/components/TradeAnalyzerDestinationResult";
import { TradeAnalysisResult } from "@/components/TradeAnalyzerLegacyResult";
import { ExactPackageResult, OneForTwoSuggestionsResult } from "@/components/TradeAnalyzerPackageResults";
import {
  BalancedSuggestionsResult,
  closestActionText,
  closestGateLabel,
  gateReasonText,
  type ClosestAlternative,
} from "@/components/TradeAnalyzerSuggestionsResult";
import { SelectedPlayer } from "@/components/TradeAnalyzerViewShared";
import type { TradeAnalyzerInitialState } from "@/components/FantasyTradeAnalyzerPage";
import {
  fetchAutomaticOneForTwoSuggestions,
  fetchBalancedTradeSuggestions,
  fetchFantasyTradeAnalysis,
  fetchFantasyTradePartners,
  fetchTradeDraftAssets,
  fetchTradePackageAnalysis,
  type BalancedTradeSuggestion,
  type FantasyAutomaticTradePackageSuggestions,
  type FantasyBalancedTradeSuggestions,
  type FantasyPlayerPerformance,
  type FantasyTradeAnalysis,
  type FantasyTradePartners,
  type FantasyTradePackageAnalysis,
  type TradeBasis,
  type TradePartner,
  type TradePackageCompletionOption,
} from "@/lib/api";
import type { DraftAsset } from "@/lib/draftAssetTypes";
import type { LeagueSlug } from "@/lib/leagues";

type Mode = "suggestions" | "analyze" | "partners";
type SuggestionShape = "one_for_one" | "one_for_two";
type PackageRepairContext = {
  incomingName: string;
  counterpartyTeamName: string;
  passedGateCount: number;
  failedGates: ClosestAlternative["failed_gates"];
  primaryBlockerReason: string;
  suggestedAction: string;
};

export default function TradeAnalyzerWorkspace({
  league,
  teamId,
  teamName,
  personalTeamId,
  ownPlayers,
  leaguePlayers,
  initialState,
}: {
  league: LeagueSlug;
  teamId: string;
  teamName: string;
  personalTeamId: string;
  ownPlayers: FantasyPlayerPerformance[];
  leaguePlayers: FantasyPlayerPerformance[];
  initialState: TradeAnalyzerInitialState;
}) {
  const router = useRouter();
  const requestSequence = useRef(0);
  const [mode, setMode] = useState<Mode>(initialState.mode);
  const [basis, setBasis] = useState<TradeBasis>(initialState.basis);
  const [outgoing, setOutgoing] = useState(initialState.outgoing);
  const [incoming, setIncoming] = useState(initialState.incoming);
  const [outgoingTwo, setOutgoingTwo] = useState("");
  const [incomingTwo, setIncomingTwo] = useState("");
  const [selectedDrop, setSelectedDrop] = useState("");
  const [counterpartyDrop, setCounterpartyDrop] = useState("");
  const [selectedPicks, setSelectedPicks] = useState<number[]>([]);
  const [counterpartyPicks, setCounterpartyPicks] = useState<number[]>([]);
  const [draftAssets, setDraftAssets] = useState<DraftAsset[]>([]);
  const [draftAssetsError, setDraftAssetsError] = useState<string | null>(null);
  const [partnerTeam, setPartnerTeam] = useState(initialState.partner);
  const [analysis, setAnalysis] = useState<FantasyTradeAnalysis | null>(null);
  const [partners, setPartners] = useState<FantasyTradePartners | null>(null);
  const [suggestions, setSuggestions] = useState<FantasyBalancedTradeSuggestions | null>(null);
  const [packageSuggestions, setPackageSuggestions] = useState<FantasyAutomaticTradePackageSuggestions | null>(null);
  const [packageAnalysis, setPackageAnalysis] = useState<FantasyTradePackageAnalysis | null>(null);
  const [suggestionShape, setSuggestionShape] = useState<SuggestionShape>("one_for_one");
  const [packageRepairContext, setPackageRepairContext] = useState<PackageRepairContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableOwn = useMemo(
    () => ownPlayers
      .filter((player) => player.nba_id != null)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [ownPlayers],
  );
  const counterpartyTeams = useMemo(() => {
    const teams = new Map<string, NonNullable<FantasyPlayerPerformance["fantasy_team"]>>();
    for (const player of leaguePlayers) {
      const team = player.fantasy_team;
      if (team?.id && team.id !== teamId) teams.set(team.id, team);
    }
    return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [leaguePlayers, teamId]);
  const incomingPlayers = useMemo(
    () => leaguePlayers
      .filter((player) => (
        player.nba_id != null
        && player.fantasy_team?.id
        && player.fantasy_team.id !== teamId
        && player.fantasy_team.id === partnerTeam
      ))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [leaguePlayers, partnerTeam, teamId],
  );
  const outgoingPlayer = selectableOwn.find((player) => String(player.nba_id) === outgoing) ?? null;
  const incomingPlayer = incomingPlayers.find((player) => String(player.nba_id) === incoming) ?? null;
  const counterpartyTeamId = partnerTeam;
  const selectedTeamPicks = useMemo(
    () => draftAssets.filter((asset) => asset.current_owner?.fantrax_team_external_id === teamId),
    [draftAssets, teamId],
  );
  const counterpartyTeamPicks = useMemo(
    () => counterpartyTeamId
      ? draftAssets.filter((asset) => asset.current_owner?.fantrax_team_external_id === counterpartyTeamId)
      : [],
    [counterpartyTeamId, draftAssets],
  );
  const hasRecentGames = leaguePlayers.some((player) => player.window_stats.games > 0);
  const pickForPlayer = mode === "analyze" && !outgoing;

  useEffect(() => {
    let cancelled = false;
    fetchTradeDraftAssets(league)
      .then((payload) => {
        if (!cancelled) setDraftAssets(payload.assets);
      })
      .catch((caught) => {
        if (!cancelled) setDraftAssetsError(caught instanceof Error ? caught.message : "Draft assets could not be loaded");
      });
    return () => { cancelled = true; };
  }, [league]);

  function syncUrl(next: {
    mode?: Mode;
    basis?: TradeBasis;
    outgoing?: string;
    incoming?: string;
    partner?: string;
  }) {
    const state = {
      mode: next.mode ?? mode,
      basis: next.basis ?? basis,
      outgoing: next.outgoing ?? outgoing,
      incoming: next.incoming ?? incoming,
      partner: next.partner ?? partnerTeam,
    };
    const params = new URLSearchParams({ mode: state.mode, basis: state.basis });
    if (state.outgoing) params.set("outgoing", state.outgoing);
    if (state.incoming) params.set("incoming", state.incoming);
    if (state.partner) params.set("partner", state.partner);
    router.replace(`/fantasy/${league}/roster/${encodeURIComponent(teamId)}/trade?${params}`, { scroll: false });
  }

  function changeMode(next: Mode) {
    requestSequence.current += 1;
    setMode(next);
    setAnalysis(null);
    setPartners(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    setPackageAnalysis(null);
    setPackageRepairContext(null);
    setError(null);
    if (next !== "analyze") {
      setIncoming("");
      setPartnerTeam("");
      syncUrl({ mode: next, incoming: "", partner: "" });
      if (next === "suggestions" && outgoing) {
        void loadSuggestions(outgoing, basis);
      }
    } else {
      syncUrl({ mode: next });
    }
  }

  function changeOutgoing(value: string) {
    requestSequence.current += 1;
    setOutgoing(value);
    setAnalysis(null);
    setPartners(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    setPackageAnalysis(null);
    setPackageRepairContext(null);
    setError(null);
    if (outgoingTwo === value) setOutgoingTwo("");
    if (selectedDrop === value) setSelectedDrop("");
    if (!value) {
      setOutgoingTwo("");
      setIncomingTwo("");
      setCounterpartyDrop("");
      setCounterpartyPicks([]);
    }
    syncUrl({ outgoing: value });
    if (mode === "suggestions" && value) {
      void loadSuggestions(value, basis);
    }
  }

  function changeIncoming(value: string) {
    requestSequence.current += 1;
    setIncoming(value);
    setAnalysis(null);
    setPackageAnalysis(null);
    setPackageRepairContext(null);
    setError(null);
    if (incomingTwo === value) setIncomingTwo("");
    if (counterpartyDrop === value) setCounterpartyDrop("");
    syncUrl({ incoming: value });
  }

  function changePartnerTeam(value: string) {
    requestSequence.current += 1;
    setPartnerTeam(value);
    setIncoming("");
    setIncomingTwo("");
    setCounterpartyDrop("");
    setCounterpartyPicks([]);
    setAnalysis(null);
    setPackageAnalysis(null);
    setPackageRepairContext(null);
    setError(null);
    syncUrl({ incoming: "", partner: value });
  }

  function changeBasis(value: TradeBasis) {
    requestSequence.current += 1;
    setBasis(value);
    setAnalysis(null);
    setPartners(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    setPackageAnalysis(null);
    setError(null);
    syncUrl({ basis: value });
    if (mode === "suggestions" && outgoing) {
      void loadSuggestions(outgoing, value, suggestionShape);
    }
  }

  function changeSuggestionShape(next: SuggestionShape) {
    requestSequence.current += 1;
    setSuggestionShape(next);
    setSuggestions(null);
    setPackageSuggestions(null);
    setPackageAnalysis(null);
    setError(null);
    if (outgoing) void loadSuggestions(outgoing, basis, next);
  }

  async function loadSuggestions(
    outgoingId: string,
    selectedBasis: TradeBasis,
    shape: SuggestionShape = suggestionShape,
  ) {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    try {
      if (shape === "one_for_two") {
        const payload = await fetchAutomaticOneForTwoSuggestions(
          league, teamId, Number(outgoingId), selectedBasis,
        );
        if (requestSequence.current === requestId) setPackageSuggestions(payload);
      } else {
        const payload = await fetchBalancedTradeSuggestions(
          league, teamId, Number(outgoingId), selectedBasis,
        );
        if (requestSequence.current === requestId) setSuggestions(payload);
      }
    } catch (caught) {
      if (requestSequence.current === requestId) {
        setError(caught instanceof Error ? caught.message : "The suggestions could not be loaded.");
      }
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }

  async function runAnalysis() {
    if (mode !== "analyze" && !outgoing) return;
    if (mode === "analyze" && (!incoming || (!outgoing && !selectedPicks.length))) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setPartners(null);
    setPackageAnalysis(null);
    try {
      if (mode === "partners") {
        const payload = await fetchFantasyTradePartners(league, teamId, Number(outgoing), basis);
        if (requestSequence.current === requestId) setPartners(payload);
      } else if (mode === "suggestions") {
        if (suggestionShape === "one_for_two") {
          const payload = await fetchAutomaticOneForTwoSuggestions(
            league, teamId, Number(outgoing), basis,
          );
          if (requestSequence.current === requestId) setPackageSuggestions(payload);
        } else {
          const payload = await fetchBalancedTradeSuggestions(league, teamId, Number(outgoing), basis);
          if (requestSequence.current === requestId) setSuggestions(payload);
        }
      } else {
        if (!counterpartyTeamId) throw new Error("Select a counterparty player first.");
        const selectedIds = outgoing
          ? [Number(outgoing), ...(outgoingTwo ? [Number(outgoingTwo)] : [])]
          : [];
        const counterpartyIds = [Number(incoming), ...(incomingTwo ? [Number(incomingTwo)] : [])];
        const payload = await fetchTradePackageAnalysis(league, {
          selected_team_id: teamId,
          counterparty_team_id: counterpartyTeamId,
          selected_team_sends: selectedIds,
          counterparty_team_sends: counterpartyIds,
          drops: {
            selected_team: selectedDrop ? Number(selectedDrop) : null,
            counterparty_team: counterpartyDrop ? Number(counterpartyDrop) : null,
          },
          assets: [
            ...selectedPicks.map((pickId) => ({ type: "draft_pick" as const, pick_id: pickId, from_team: "selected_team" as const })),
            ...counterpartyPicks.map((pickId) => ({ type: "draft_pick" as const, pick_id: pickId, from_team: "counterparty_team" as const })),
          ],
          basis,
        });
        if (requestSequence.current === requestId) setPackageAnalysis(payload);
      }
    } catch (caught) {
      if (requestSequence.current === requestId) {
        setError(caught instanceof Error ? caught.message : "The analysis could not be completed.");
      }
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }

  async function analyzeExpandedPickPackage(
    original: FantasyTradePackageAnalysis,
    option: TradePackageCompletionOption,
  ) {
    if (
      original.analysis_scope !== "pick_for_player_context"
      || option.type !== "expanded_package"
      || option.team !== "selected_team"
      || option.completion_status !== "legal_as_expanded_package"
      || !partnerTeam
    ) return;
    const incomingId = original.package.counterparty_team_sends[0]?.nba_id;
    const picks = original.package.assets.filter((asset) => asset.from_team === "selected_team");
    if (!incomingId || !picks.length) return;

    const requestId = ++requestSequence.current;
    const outgoingId = String(option.player.nba_id);
    setOutgoing(outgoingId);
    setOutgoingTwo("");
    setIncomingTwo("");
    setSelectedDrop("");
    setCounterpartyDrop("");
    setSelectedPicks(picks.map((pick) => pick.pick_id));
    setCounterpartyPicks([]);
    setPackageAnalysis(null);
    setError(null);
    setLoading(true);
    syncUrl({ outgoing: outgoingId });
    try {
      const result = await fetchTradePackageAnalysis(league, {
        selected_team_id: teamId,
        counterparty_team_id: partnerTeam,
        selected_team_sends: [option.player.nba_id],
        counterparty_team_sends: [incomingId],
        drops: { selected_team: null, counterparty_team: null },
        assets: picks.map((pick) => ({
          type: "draft_pick",
          pick_id: pick.pick_id,
          from_team: "selected_team",
        })),
        basis,
      });
      if (requestSequence.current === requestId) setPackageAnalysis(result);
    } catch (caught) {
      if (requestSequence.current === requestId) {
        setError(caught instanceof Error ? caught.message : "The completed trade could not be analyzed.");
      }
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }

  async function analyzeSuggestion(
    suggestion: BalancedTradeSuggestion,
    repairContext: PackageRepairContext | null = null,
  ) {
    const incomingId = suggestion.trade.incoming.nba_id;
    if (incomingId == null) return;
    const requestId = ++requestSequence.current;
    setMode("analyze");
    setIncoming(String(incomingId));
    setPartnerTeam(suggestion.trade.counterparty_team_id);
    setOutgoingTwo("");
    setIncomingTwo("");
    setSelectedDrop("");
    setCounterpartyDrop("");
    setSelectedPicks([]);
    setCounterpartyPicks([]);
    setPackageRepairContext(repairContext);
    setAnalysis(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    setPackageAnalysis(null);
    setLoading(true);
    setError(null);
    syncUrl({
      mode: "analyze",
      incoming: String(incomingId),
      partner: suggestion.trade.counterparty_team_id,
    });
    try {
      const payload = await fetchFantasyTradeAnalysis(
        league, teamId, Number(outgoing), incomingId, basis,
      );
      if (requestSequence.current === requestId) setAnalysis(payload);
    } catch (caught) {
      if (requestSequence.current === requestId) {
        setError(caught instanceof Error ? caught.message : "The analysis could not be completed.");
      }
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }

  function buildAlternativePackage(
    alternative: ClosestAlternative,
    suggestion: BalancedTradeSuggestion,
  ) {
    void analyzeSuggestion(suggestion, {
      incomingName: suggestion.trade.incoming.name,
      counterpartyTeamName: suggestion.counterparty_team.team.name,
      passedGateCount: alternative.passed_gate_count,
      failedGates: alternative.failed_gates,
      primaryBlockerReason: alternative.primary_blocker.reason,
      suggestedAction: closestActionText(alternative),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exploreReturns(partner: TradePartner) {
    setMode("analyze");
    setPartnerTeam(partner.team.id);
    setIncoming("");
    setPartners(null);
    setError(null);
    syncUrl({ mode: "analyze", incoming: "", partner: partner.team.id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    requestSequence.current += 1;
    setMode("suggestions");
    setBasis("season");
    setOutgoing("");
    setIncoming("");
    setPartnerTeam("");
    setAnalysis(null);
    setPartners(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    setPackageAnalysis(null);
    setSuggestionShape("one_for_one");
    setOutgoingTwo("");
    setIncomingTwo("");
    setSelectedDrop("");
    setCounterpartyDrop("");
    setSelectedPicks([]);
    setCounterpartyPicks([]);
    setPackageRepairContext(null);
    setError(null);
    router.replace(`/fantasy/${league}/roster/${encodeURIComponent(teamId)}/trade`, { scroll: false });
  }

  return (
    <>
      {teamId !== personalTeamId && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          This analyzer is intended for the signed-in manager&apos;s personal team. The explicit team route remains reusable for future multi-manager mapping.
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:w-fit">
            <ModeButton active={mode === "suggestions"} onClick={() => changeMode("suggestions")}>Suggested trades</ModeButton>
            <ModeButton active={mode === "analyze"} onClick={() => changeMode("analyze")}>Analyze trade</ModeButton>
            <ModeButton active={mode === "partners"} onClick={() => changeMode("partners")}>Find destinations</ModeButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <ModeButton active={basis === "season"} onClick={() => changeBasis("season")}>Season</ModeButton>
              <ModeButton active={basis === "window"} disabled={!hasRecentGames} onClick={() => changeBasis("window")}>Recent 14d</ModeButton>
            </div>
            <button type="button" onClick={reset} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:text-slate-300">
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <PlayerSelector
            label={mode === "analyze" ? "You give · player optional" : "You give"}
            helper={mode === "analyze" ? `Players on ${teamName}, or leave empty to send picks only` : `Players on ${teamName}`}
            value={outgoing}
            players={selectableOwn}
            onChange={changeOutgoing}
            selected={outgoingPlayer}
            emptyMessage={mode === "analyze" ? "No player selected. You can send eligible picks instead." : undefined}
          />
          {mode === "analyze" ? (
            <CounterpartyPlayerSelector
              teams={counterpartyTeams}
              teamValue={partnerTeam}
              onTeamChange={changePartnerTeam}
              value={incoming}
              players={incomingPlayers}
              onChange={changeIncoming}
              selected={incomingPlayer}
            />
          ) : mode === "partners" ? (
            <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-5 dark:border-blue-800 dark:bg-blue-950/20">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Market discovery</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Who needs this player most?</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Teams are ranked by category fit and a conservative cap screen. No return player or return salary is assumed yet.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-5 dark:border-blue-800 dark:bg-blue-950/20">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Balanced market search</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                {suggestionShape === "one_for_two" ? "Find realistic two-player returns" : "Find realistic one-for-one returns"}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {suggestionShape === "one_for_two"
                  ? "Two-player return packages are screened exactly. If roster limits require a drop or a second outgoing player, you choose the completion."
                  : "Every rostered return is screened for category value, both teams&apos; cap legality, and counterparty benefit."}
              </p>
            </div>
          )}
        </div>

        {mode === "analyze" && packageRepairContext && outgoingPlayer && incomingPlayer && (
          <PackageRepairBanner
            context={packageRepairContext}
            outgoingName={outgoingPlayer.name}
          />
        )}

        {mode === "analyze" && incoming && (
          <ExactPackageBuilder
            ownPlayers={selectableOwn}
            counterpartyPlayers={incomingPlayers}
            outgoing={outgoing}
            incoming={incoming}
            outgoingTwo={outgoingTwo}
            incomingTwo={incomingTwo}
            selectedDrop={selectedDrop}
            counterpartyDrop={counterpartyDrop}
            selectedPicks={selectedPicks}
            counterpartyPicks={counterpartyPicks}
            selectedTeamPicks={selectedTeamPicks}
            counterpartyTeamPicks={counterpartyTeamPicks}
            draftAssetsError={draftAssetsError}
            onOutgoingTwo={(value) => { setOutgoingTwo(value); setAnalysis(null); setPackageAnalysis(null); }}
            onIncomingTwo={(value) => { setIncomingTwo(value); setAnalysis(null); setPackageAnalysis(null); }}
            onSelectedDrop={(value) => { setSelectedDrop(value); setAnalysis(null); setPackageAnalysis(null); }}
            onCounterpartyDrop={(value) => { setCounterpartyDrop(value); setAnalysis(null); setPackageAnalysis(null); }}
            onSelectedPicks={(value) => { setSelectedPicks(value); setAnalysis(null); setPackageAnalysis(null); }}
            onCounterpartyPicks={(value) => { setCounterpartyPicks(value); setAnalysis(null); setPackageAnalysis(null); }}
          />
        )}

        {mode === "suggestions" && (
          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Search shape</p>
              <p className="mt-0.5 text-xs text-slate-400">Start simple or explore a larger return package.</p>
            </div>
            <div className="flex w-full gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:w-fit">
              <ModeButton active={suggestionShape === "one_for_one"} disabled={loading} onClick={() => changeSuggestionShape("one_for_one")}>1-for-1</ModeButton>
              <ModeButton active={suggestionShape === "one_for_two"} disabled={loading} onClick={() => changeSuggestionShape("one_for_two")}>1-for-2</ModeButton>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {mode === "analyze"
              ? "The final result simulates both teams and applies the configured season cap policy."
              : mode === "partners"
                ? "Destination fit is directional. Select a team afterward to evaluate an exact return."
                : suggestionShape === "one_for_two"
                  ? "One-for-two suggestions never choose a required drop or package expansion for you."
                  : "Balanced suggestions never relax cap rules or hide category losses."}
          </p>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading || (mode !== "analyze" && !outgoing) || (mode === "analyze" && (!incoming || (pickForPlayer && !selectedPicks.length)))}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            {loading
              ? "Analyzing…"
              : mode === "analyze" ? "Analyze trade"
                : mode === "partners" ? "Rank destination teams" : "Find suggested trades"}
          </button>
        </div>
      </section>

      {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {loading && <LoadingResult />}
      {analysis && <TradeAnalysisResult analysis={analysis} outgoing={outgoingPlayer} incoming={incomingPlayer} league={league} />}
      {partners && <TradeAnalyzerDestinationResult payload={partners} onExplore={exploreReturns} />}
      {suggestions && (
        <BalancedSuggestionsResult
          payload={suggestions}
          onAnalyze={analyzeSuggestion}
          onBuildPackage={buildAlternativePackage}
        />
      )}
      {packageSuggestions && <OneForTwoSuggestionsResult payload={packageSuggestions} />}
      {packageAnalysis && <ExactPackageResult payload={packageAnalysis} league={league} onAnalyzeExpandedPickPackage={analyzeExpandedPickPackage} />}
    </>
  );
}

function PackageRepairBanner({ context, outgoingName }: {
  context: PackageRepairContext;
  outgoingName: string;
}) {
  return (
    <div className="border-t border-blue-200 bg-blue-50 px-4 py-4 dark:border-blue-900 dark:bg-blue-950/25">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
            Package repair starting point
          </p>
          <h2 className="mt-1 font-black text-slate-950 dark:text-white">
            {outgoingName} for {context.incomingName}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            This one-for-one starting point passes {context.passedGateCount}/3 strict checks. Review: {context.failedGates.map(closestGateLabel).join(" and ")}.
          </p>
          <p className="mt-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
            {context.suggestedAction}
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">
          {context.counterpartyTeamName}
        </span>
      </div>
      <p className="mt-3 border-t border-blue-200 pt-3 text-xs text-slate-600 dark:border-blue-900 dark:text-slate-300">
        The primary players and partner are preselected. Adjust either side with an optional second player, then run Analyze trade. You can also attach eligible canonical picks as shadow negotiation context; picks never change the recommendation tier. Nothing is added automatically.
      </p>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        Primary blocker: {gateReasonText(context.primaryBlockerReason)}
      </p>
    </div>
  );
}

function ExactPackageBuilder({
  ownPlayers,
  counterpartyPlayers,
  outgoing,
  incoming,
  outgoingTwo,
  incomingTwo,
  selectedDrop,
  counterpartyDrop,
  selectedPicks,
  counterpartyPicks,
  selectedTeamPicks,
  counterpartyTeamPicks,
  draftAssetsError,
  onOutgoingTwo,
  onIncomingTwo,
  onSelectedDrop,
  onCounterpartyDrop,
  onSelectedPicks,
  onCounterpartyPicks,
}: {
  ownPlayers: FantasyPlayerPerformance[];
  counterpartyPlayers: FantasyPlayerPerformance[];
  outgoing: string;
  incoming: string;
  outgoingTwo: string;
  incomingTwo: string;
  selectedDrop: string;
  counterpartyDrop: string;
  selectedPicks: number[];
  counterpartyPicks: number[];
  selectedTeamPicks: DraftAsset[];
  counterpartyTeamPicks: DraftAsset[];
  draftAssetsError: string | null;
  onOutgoingTwo: (value: string) => void;
  onIncomingTwo: (value: string) => void;
  onSelectedDrop: (value: string) => void;
  onCounterpartyDrop: (value: string) => void;
  onSelectedPicks: (value: number[]) => void;
  onCounterpartyPicks: (value: number[]) => void;
}) {
  const ownAvailable = ownPlayers.filter((player) => String(player.nba_id) !== outgoing);
  const counterpartyAvailable = counterpartyPlayers.filter((player) => String(player.nba_id) !== incoming);
  const ownDropCandidates = ownAvailable.filter((player) => String(player.nba_id) !== outgoingTwo);
  const counterpartyDropCandidates = counterpartyAvailable.filter((player) => String(player.nba_id) !== incomingTwo);
  return (
    <div className="border-t border-slate-200 bg-blue-50/35 p-4 dark:border-slate-700 dark:bg-blue-950/10">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">Exact package builder</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {outgoing
            ? "Add an optional second player, up to two canonical picks per side, and a roster-completion drop."
            : "Select one or two of your eligible picks for the chosen player. If a roster slot is needed, choose a drop explicitly."}
        </p>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <PackageInputs
          title="Your team"
          allowSecondPlayer={Boolean(outgoing)}
          secondPlayers={ownAvailable}
          secondValue={outgoingTwo}
          dropPlayers={ownDropCandidates}
          dropValue={selectedDrop}
          picks={selectedTeamPicks}
          selectedPicks={selectedPicks}
          onSecond={onOutgoingTwo}
          onDrop={onSelectedDrop}
          onPicks={onSelectedPicks}
        />
        {outgoing ? (
          <PackageInputs
            title="Partner team"
            secondPlayers={counterpartyAvailable}
            secondValue={incomingTwo}
            dropPlayers={counterpartyDropCandidates}
            dropValue={counterpartyDrop}
            picks={counterpartyTeamPicks}
            selectedPicks={counterpartyPicks}
            onSecond={onIncomingTwo}
            onDrop={onCounterpartyDrop}
            onPicks={onCounterpartyPicks}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <h3 className="font-black text-slate-950 dark:text-white">Partner team</h3>
            <p className="mt-2">Sends the selected player. This pick-for-player view does not add another player or pick from the partner.</p>
          </div>
        )}
      </div>
      {draftAssetsError && <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">Picks unavailable: {draftAssetsError}. {outgoing ? "Player-only analysis remains available." : "Pick-for-player analysis needs eligible canonical picks."}</p>}
      <p className="mt-3 text-xs text-slate-500">Only eligible, unencumbered picks mapped to the canonical current owner are shown. Nothing is transferred automatically.</p>
    </div>
  );
}

function PackageInputs({
  title, allowSecondPlayer = true, secondPlayers, secondValue, dropPlayers, dropValue, picks, selectedPicks,
  onSecond, onDrop, onPicks,
}: {
  title: string;
  allowSecondPlayer?: boolean;
  secondPlayers: FantasyPlayerPerformance[];
  secondValue: string;
  dropPlayers: FantasyPlayerPerformance[];
  dropValue: string;
  picks: DraftAsset[];
  selectedPicks: number[];
  onSecond: (value: string) => void;
  onDrop: (value: string) => void;
  onPicks: (value: number[]) => void;
}) {
  function togglePick(pickId: number) {
    if (selectedPicks.includes(pickId)) onPicks(selectedPicks.filter((id) => id !== pickId));
    else if (selectedPicks.length < 2) onPicks([...selectedPicks, pickId]);
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {allowSecondPlayer && (
          <CompactPlayerSelect
            label="Second player (optional)"
            value={secondValue}
            players={secondPlayers}
            onChange={(value) => {
              if (dropValue === value) onDrop("");
              onSecond(value);
            }}
          />
        )}
        <CompactPlayerSelect label="Drop after trade (optional)" value={dropValue} players={dropPlayers} onChange={onDrop} />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Draft picks sent</p>
          <span className="text-[10px] font-semibold text-slate-400">{selectedPicks.length}/2</span>
        </div>
        {picks.length ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {picks.map((pick) => {
              const checked = selectedPicks.includes(pick.id);
              const disabled = !checked && selectedPicks.length >= 2;
              return (
                <label key={pick.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 ${checked ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-slate-200 dark:border-slate-700"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => togglePick(pick.id)} className="mt-0.5" />
                  <span className="min-w-0 text-xs">
                    <span className="block font-black text-slate-900 dark:text-white">{pick.draft_year} · Round {pick.round}</span>
                    <span className="block truncate text-slate-500">Originally {pick.original_franchise.name}</span>
                    <span className="mt-1 block font-semibold text-blue-700 dark:text-blue-300">{pickBandLabel(pick)}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : <p className="mt-2 text-xs text-slate-400">No eligible canonical picks for this team.</p>}
      </div>
    </div>
  );
}

function CompactPlayerSelect({ label, value, players, onChange }: {
  label: string;
  value: string;
  players: FantasyPlayerPerformance[];
  onChange: (value: string) => void;
}) {
  const options = useMemo(
    () => players.map((player) => ({
      id: String(player.nba_id),
      name: player.name,
      meta: [player.position || "—", player.nba_team_short || player.nba_team].filter(Boolean).join(" · "),
    })),
    [players],
  );
  return (
    <SearchablePlayerPicker
      label={label}
      placeholder="Search or leave empty…"
      value={value}
      options={options}
      emptyLabel="No matching players"
      onChange={onChange}
    />
  );
}

function pickBandLabel(pick: DraftAsset): string {
  const band = pick.valuation?.compensation_band;
  if (!band) return "Valuation unavailable";
  return band.conservative === band.optimistic
    ? band.conservative.replaceAll("_", " ")
    : `${band.conservative.replaceAll("_", " ")} → ${band.optimistic.replaceAll("_", " ")}`;
}

function ModeButton({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${active ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400"}`}>
      {children}
    </button>
  );
}

function PlayerSelector({ label, helper, value, players, selected, grouped = false, emptyMessage, onChange }: {
  label: string;
  helper: string;
  value: string;
  players: FantasyPlayerPerformance[];
  selected: FantasyPlayerPerformance | null;
  grouped?: boolean;
  emptyMessage?: string;
  onChange: (value: string) => void;
}) {
  const options = useMemo(
    () => buildPickerOptions(players, grouped),
    [players, grouped],
  );
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <SearchablePlayerPicker
        label={label}
        helper={helper}
        placeholder="Search players…"
        value={value}
        options={options}
        onChange={onChange}
      />
      {selected ? <SelectedPlayer player={selected} /> : <p className="mt-4 rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400 dark:bg-slate-800/60">{emptyMessage ?? "No player selected"}</p>}
    </div>
  );
}

function CounterpartyPlayerSelector({ teams, teamValue, onTeamChange, value, players, selected, onChange }: {
  teams: Array<NonNullable<FantasyPlayerPerformance["fantasy_team"]>>;
  teamValue: string;
  onTeamChange: (value: string) => void;
  value: string;
  players: FantasyPlayerPerformance[];
  selected: FantasyPlayerPerformance | null;
  onChange: (value: string) => void;
}) {
  const teamOptions = useMemo(
    () => teams.map((team) => ({
      id: team.id,
      name: team.name,
      meta: team.owner ? `Manager: ${team.owner}` : undefined,
    })),
    [teams],
  );
  const playerOptions = useMemo(() => buildPickerOptions(players, false), [players]);
  const teamName = teams.find((team) => team.id === teamValue)?.name;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <SearchablePlayerPicker
        label="Trade partner"
        helper="Choose the team first"
        placeholder="Search teams…"
        value={teamValue}
        options={teamOptions}
        emptyLabel="No matching teams"
        itemLabel="teams"
        onChange={onTeamChange}
      />
      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
        <SearchablePlayerPicker
          label="You receive"
          helper={teamName ? `Players on ${teamName}` : "Available after selecting a trade partner"}
          placeholder={teamValue ? "Search players…" : "Choose a team first"}
          value={value}
          options={playerOptions}
          disabled={!teamValue}
          emptyLabel="No matching players"
          onChange={onChange}
        />
      </div>
      {selected
        ? <SelectedPlayer player={selected} />
        : <p className="mt-4 rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400 dark:bg-slate-800/60">
            {teamValue ? "No player selected" : "Choose a team, then select a player"}
          </p>}
    </div>
  );
}

function buildPickerOptions(
  players: FantasyPlayerPerformance[],
  grouped: boolean,
): SearchablePlayerOption[] {
  const sorted = grouped
    ? [...players].sort((a, b) => {
        const teamCompare = (a.fantasy_team?.name ?? "Unknown team")
          .localeCompare(b.fantasy_team?.name ?? "Unknown team");
        return teamCompare || a.name.localeCompare(b.name);
      })
    : players;

  return sorted.map((player) => ({
    id: String(player.nba_id),
    name: player.name,
    meta: [player.position || "—", player.nba_team_short || player.nba_team, player.salary_2026_27]
      .filter(Boolean)
      .join(" · "),
    group: grouped ? (player.fantasy_team?.name ?? "Unknown team") : undefined,
  }));
}

function LoadingResult() {
  return <div className="mt-6 h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
}
