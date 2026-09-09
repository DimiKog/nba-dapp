"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SearchablePlayerPicker, {
  type SearchablePlayerOption,
} from "@/components/SearchablePlayerPicker";
import TeamLogo from "@/components/TeamLogo";
import type { TradeAnalyzerInitialState } from "@/components/FantasyTradeAnalyzerPage";
import {
  fetchAutomaticOneForTwoSuggestions,
  fetchBalancedTradeSuggestions,
  fetchFantasyTradeAnalysis,
  fetchFantasyTradePartners,
  fetchTradeDraftAssets,
  fetchTradePackageAnalysis,
  photoUrl,
  type AutomaticTradePackageSuggestion,
  type BalancedTradeSuggestion,
  type FantasyAutomaticTradePackageSuggestions,
  type FantasyBalancedTradeSuggestions,
  type FantasyPlayerPerformance,
  type FantasyTradeAnalysis,
  type FantasyTradePartners,
  type FantasyTradePackageAnalysis,
  type TradeBasis,
  type TradeCapResult,
  type TradeCategoryChange,
  type TradePartner,
  type TradePackageCompletionOption,
  type TradePackageProductionValue,
  type TradePlayerSummary,
  type TradePayrollComparison,
  type TradeSuggestionPickOption,
  type TradeSuggestionPickCompensation,
  type TradeTeamResult,
  type TradeWarning,
} from "@/lib/api";
import type { DraftAsset } from "@/lib/draftAssetTypes";

type LeagueSlug = "ldl" | "bdb";
type Mode = "suggestions" | "analyze" | "partners";
type SuggestionShape = "one_for_one" | "one_for_two";
type RecommendationFilter = "all" | "proposable" | "exploratory";
type PickGuidanceFilter = "all" | "receive" | "send" | "not_required" | "unavailable";
type CapStatusFilter = "all" | "compliant" | "plan_required" | "not_eligible";

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
    setError(null);
    if (outgoingTwo === value) setOutgoingTwo("");
    if (selectedDrop === value) setSelectedDrop("");
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
    if (!outgoing || (mode === "analyze" && !incoming)) return;
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
        const selectedIds = [Number(outgoing), ...(outgoingTwo ? [Number(outgoingTwo)] : [])];
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

  async function analyzeSuggestion(suggestion: BalancedTradeSuggestion) {
    const incomingId = suggestion.trade.incoming.nba_id;
    if (incomingId == null) return;
    const requestId = ++requestSequence.current;
    setMode("analyze");
    setIncoming(String(incomingId));
    setPartnerTeam(suggestion.trade.counterparty_team_id);
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
            label="You give"
            helper={`Players on ${teamName}`}
            value={outgoing}
            players={selectableOwn}
            onChange={changeOutgoing}
            selected={outgoingPlayer}
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

        {mode === "analyze" && outgoing && incoming && (
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
            onOutgoingTwo={(value) => { setOutgoingTwo(value); setPackageAnalysis(null); }}
            onIncomingTwo={(value) => { setIncomingTwo(value); setPackageAnalysis(null); }}
            onSelectedDrop={(value) => { setSelectedDrop(value); setPackageAnalysis(null); }}
            onCounterpartyDrop={(value) => { setCounterpartyDrop(value); setPackageAnalysis(null); }}
            onSelectedPicks={(value) => { setSelectedPicks(value); setPackageAnalysis(null); }}
            onCounterpartyPicks={(value) => { setCounterpartyPicks(value); setPackageAnalysis(null); }}
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
            disabled={loading || !outgoing || (mode === "analyze" && !incoming)}
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
      {partners && <PartnerRankingResult payload={partners} onExplore={exploreReturns} />}
      {suggestions && <BalancedSuggestionsResult payload={suggestions} onAnalyze={analyzeSuggestion} />}
      {packageSuggestions && <OneForTwoSuggestionsResult payload={packageSuggestions} />}
      {packageAnalysis && <ExactPackageResult payload={packageAnalysis} league={league} />}
    </>
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
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Add an optional second player, up to two canonical picks per side, and a roster-completion drop.</p>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <PackageInputs
          title="Your team"
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
      </div>
      {draftAssetsError && <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">Picks unavailable: {draftAssetsError}. Player-only analysis remains available.</p>}
      <p className="mt-3 text-xs text-slate-500">Only eligible, unencumbered picks mapped to the canonical current owner are shown. Nothing is transferred automatically.</p>
    </div>
  );
}

function PackageInputs({
  title, secondPlayers, secondValue, dropPlayers, dropValue, picks, selectedPicks,
  onSecond, onDrop, onPicks,
}: {
  title: string;
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
        <CompactPlayerSelect
          label="Second player (optional)"
          value={secondValue}
          players={secondPlayers}
          onChange={(value) => {
            if (dropValue === value) onDrop("");
            onSecond(value);
          }}
        />
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

function PlayerSelector({ label, helper, value, players, selected, grouped = false, onChange }: {
  label: string;
  helper: string;
  value: string;
  players: FantasyPlayerPerformance[];
  selected: FantasyPlayerPerformance | null;
  grouped?: boolean;
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
      {selected ? <SelectedPlayer player={selected} /> : <p className="mt-4 rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400 dark:bg-slate-800/60">No player selected</p>}
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

function SelectedPlayer({ player }: { player: FantasyPlayerPerformance }) {
  const photo = photoUrl(player.photo, player.nba_id);
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        {photo ? <Image src={photo} alt={player.name} fill className="object-cover" unoptimized /> : <span className="flex h-full items-center justify-center font-bold text-slate-400">{player.name[0]}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-slate-950 dark:text-white">{player.name}</p>
        <p className="truncate text-xs text-slate-500">{[player.nba_team_short || player.nba_team, player.position, player.fantasy_team?.name].filter(Boolean).join(" · ")}</p>
        {player.injury && <p className="mt-1 truncate text-xs font-medium text-red-600 dark:text-red-400">{injuryText(player)}</p>}
      </div>
      <p className="text-sm font-bold tabular-nums text-blue-700 dark:text-blue-300">{player.salary_2026_27 ?? "$0"}</p>
    </div>
  );
}

function OneForTwoSuggestionsResult({ payload }: { payload: FantasyAutomaticTradePackageSuggestions }) {
  const effectiveCounts = payload.suggestions.reduce(
    (counts, suggestion) => {
      counts[effectivePackageTier(suggestion)] += 1;
      return counts;
    },
    { proposable: 0, exploratory: 0, not_recommended: 0 },
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

function OneForTwoSuggestionCard({ suggestion, rank, league, picksAssessed = false }: {
  suggestion: AutomaticTradePackageSuggestion;
  rank: number;
  league: LeagueSlug;
  picksAssessed?: boolean;
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
            <p className="text-xs text-slate-500">Fit {formatSigned(suggestion.selected_team.category_score.score)} · partner {suggestion.counterparty_team.acceptance.status}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TierBadge tier={effectiveTier} />
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${legalAsProposed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : hasCompletion ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
            {legalAsProposed ? "Legal as proposed" : hasCompletion ? "Completion required" : "No legal completion"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] lg:items-stretch">
        <PackageSide title="You send" players={suggestion.package.selected_team_sends} />
        <div className="flex items-center justify-center text-xl font-black text-slate-300">⇄</div>
        <PackageSide title="You receive" players={suggestion.package.counterparty_team_sends} />
      </div>

      <ProductionValuePanel value={productionValue} usesCompletion={valueUsesCompletion} picksAssessed={picksAssessed} />

      <div className="grid gap-3 border-t border-slate-200 p-4 dark:border-slate-700 md:grid-cols-3">
        <PackageMetric label="Your category fit" value={formatSigned(suggestion.selected_team.category_score.score)} tone={suggestion.selected_team.category_score.score >= 0 ? "positive" : "danger"} />
        <PackageMetric label="Your cap result" value={capResultLabel(suggestion.selected_team.payroll.current_cap_result)} tone={suggestion.selected_team.cap_legality.eligible ? "positive" : "danger"} />
        <PackageMetric label="Partner response" value={suggestion.counterparty_team.acceptance.reason} tone={suggestion.counterparty_team.acceptance.status === "positive" ? "positive" : "neutral"} />
      </div>

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

function oneForOneValueVerdict(value: TradePackageProductionValue) {
  if (value.classification === "balanced") return {
    label: "Player value balanced",
    description: "The player-only return clears the current production-value threshold.",
    box: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/25",
    text: "text-emerald-800 dark:text-emerald-200",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  };
  if (value.classification === "materially_equivalent") return {
    label: "Replacement-level comparison",
    description: "Both players are at or below the current free-agent replacement baseline. This remains exploratory because the value model cannot distinguish a strict win-win return.",
    box: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/25",
    text: "text-sky-800 dark:text-sky-200",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200",
  };
  if (value.classification === "uneven") return {
    label: "Additional assets required",
    description: "The player return is close, but a useful pick or another asset should bridge the value gap.",
    box: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25",
    text: "text-amber-900 dark:text-amber-200",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  };
  if (value.classification === "severely_uneven") return {
    label: "Not recommended player-only",
    description: "The production gap is too large to call this balanced without substantial additional compensation.",
    box: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25",
    text: "text-red-800 dark:text-red-200",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  };
  return {
    label: "Player value unavailable",
    description: "The analyzer could not establish a trusted replacement-value comparison.",
    box: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60",
    text: "text-slate-700 dark:text-slate-200",
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
  };
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
        title: "Replacement-level comparison",
        detail: "Both packages are at or below the current replacement baseline. Keep this as context, not as a balanced recommendation.",
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
          detail: "The analyzer could not establish a trusted replacement-value comparison, so this package cannot be called proposable.",
          classes: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
        };
  return (
    <div className={`mx-4 mb-4 rounded-xl border p-4 ${presentation.classes}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]">Production-value check{usesCompletion ? " · best legal completion" : ""}</p>
          <h4 className="mt-1 font-black">{presentation.title}</h4>
          <p className="mt-1 max-w-3xl text-sm opacity-90">{presentation.detail}</p>
        </div>
        {yourRatio != null && <span className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-black tabular-nums dark:bg-slate-950/40">You receive {yourRatio}% of sent value</span>}
      </div>
      {partnerRatio != null && (
        <p className="mt-3 text-xs font-semibold opacity-80">Partner receives {partnerRatio}% of the value they send.</p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ValueExchange label="Your team" value={value.selected_team} />
        <ValueExchange label="Partner team" value={value.counterparty_team} />
      </div>
      {value.compensation_required && (
        <p className="mt-3 text-xs font-bold">
          {picksAssessed ? "Pick value is assessed separately below and does not alter this player-value result" : "Unpriced picks are not counted yet"}{gap > 0 ? ` · estimated production gap to the balanced threshold: ${formatValueScore(gap)}` : ""}.
        </p>
      )}
    </div>
  );
}

function ExactPackageResult({ payload, league }: { payload: FantasyTradePackageAnalysis; league: LeagueSlug }) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-900 dark:bg-slate-900">
      <div className="border-b border-blue-100 p-5 dark:border-blue-900/60">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Exact package result</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Players, legality and picks evaluated together</h2>
        <p className="mt-1 text-sm text-slate-500">The player recommendation remains independent from the ordinal pick assessment.</p>
      </div>
      <div className="p-4">
        <OneForTwoSuggestionCard suggestion={payload} rank={1} league={league} picksAssessed={payload.package.assets.length > 0} />
        <ManualTradeCategoryImpact changes={payload.selected_team.category_changes} />
        <PickValuePanel payload={payload} />
      </div>
      <MethodNote>Manual exact package · 1–2 players per side · up to two canonical picks per side · no automatic transfer · pick value never changes the recommendation tier.</MethodNote>
    </section>
  );
}

function ManualTradeCategoryImpact({ changes }: { changes: TradeCategoryChange[] }) {
  const finiteDeltas = changes
    .map((change) => change.z_delta)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const maximumDelta = Math.max(0, ...finiteDeltas.map((value) => Math.abs(value)));
  const scaleCeiling = Math.max(0.5, Math.ceil(maximumDelta * 2) / 2);
  const improving = changes.filter((change) => ["weakness_resolved", "improved"].includes(change.transition)).length;
  const declining = changes.filter((change) => ["new_weakness", "declined"].includes(change.transition)).length;
  const stable = changes.length - improving - declining;

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-labelledby="manual-category-impact-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Your team · category impact</p>
          <h3 id="manual-category-impact-title" className="mt-1 text-lg font-black text-slate-950 dark:text-white">Before → after the trade</h3>
          <p className="mt-1 text-xs text-slate-500">Rank shows your position among league teams; the bar shows the relative strength change.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-500">
          <span><strong className="text-emerald-600 dark:text-emerald-400">{improving}</strong> improve</span>
          <span><strong className="text-red-600 dark:text-red-400">{declining}</strong> decline</span>
          <span><strong className="text-slate-700 dark:text-slate-200">{stable}</strong> stable</span>
        </div>
      </div>

      <div className="grid gap-x-6 px-4 py-2 xl:grid-cols-2">
        {changes.map((change) => (
          <CategoryImpactBar key={change.key} change={change} scaleCeiling={scaleCeiling} />
        ))}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
        <p><strong>How to read it:</strong> positive means your team improves relative to the league; negative means it declines. It is not a percentage or a probability.</p>
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

function PickValuePanel({ payload }: { payload: FantasyTradePackageAnalysis }) {
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
          <PickSideAssessment title="Your team receives" side={pickValue.selected_team} />
          <PickSideAssessment title="Partner receives" side={pickValue.counterparty_team} />
        </div>
      )}
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">Picks are read from the canonical ledger and checked against their mapped current owner. This analysis neither transfers them nor silently turns an exploratory player package into a proposable one.</p>
    </div>
  );
}

function PickSideAssessment({ title, side }: { title: string; side: NonNullable<FantasyTradePackageAnalysis["pick_value"]>["selected_team"] }) {
  const band = side.combined_valuation?.compensation_band;
  const sufficiency = side.assessment?.sufficiency;
  return (
    <div className="rounded-lg border border-violet-100 bg-white p-3 dark:border-violet-900 dark:bg-slate-900">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-1 font-black text-slate-950 dark:text-white">
        {band ? (band.conservative === band.optimistic ? band.conservative : `${band.conservative} → ${band.optimistic}`).replaceAll("_", " ") : "No valued pick received"}
      </p>
      {sufficiency && <p className="mt-1 text-xs font-semibold text-violet-700 dark:text-violet-300">{sufficiency.replaceAll("_", " ")}</p>}
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

function retainedValuePercent(value: number | null): number | null {
  return value == null ? null : Math.round(value * 100);
}

function PackageSide({ title, players }: { title: string; players: TradePlayerSummary[] }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {players.map((player) => <PackagePlayer key={player.nba_id} player={player} />)}
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
  return <span className={`rounded-full font-bold uppercase ${compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-xs"} ${positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : tier === "exploratory" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{tier.replace("_", " ")}</span>;
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

function BalancedSuggestionsResult({ payload, onAnalyze }: {
  payload: FantasyBalancedTradeSuggestions;
  onAnalyze: (suggestion: BalancedTradeSuggestion) => void;
}) {
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>("all");
  const [pickFilter, setPickFilter] = useState<PickGuidanceFilter>("all");
  const [capFilter, setCapFilter] = useState<CapStatusFilter>("all");
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
  const visibleCount = filteredTeams.reduce((count, group) => count + group.suggestions.length, 0);
  const filtersActive = recommendationFilter !== "all" || pickFilter !== "all" || capFilter !== "all";
  const gateCounts = payload.diagnostics.strict_gate_counts;

  function clearFilters() {
    setRecommendationFilter("all");
    setPickFilter("all");
    setCapFilter("all");
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-5 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Balanced trade market</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Returns for {payload.outgoing.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payload.counts.returned} suggestions shown · {payload.teams.length} teams · {basisLabel(payload.basis_used)}
            </p>
          </div>
          <div className="text-right">
            <div className="flex flex-wrap justify-end gap-2 text-xs font-bold">
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{payload.counts.proposable} strict win-win matches</span>
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">{payload.counts.exploratory} exploratory candidates</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Candidate counts cover the full market scan; cards show the top returned results.</p>
          </div>
        </div>
      </div>
      {payload.fallback_reason && <FallbackBanner />}
      {gateCounts && gateCounts.eligible_after_hard_filters > 0 && (
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Strict qualification gates</p>
          <p className="mt-1 text-xs text-slate-500">Each count is measured independently across {gateCounts.eligible_after_hard_filters} cap-legal pairs.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <GateCount label="Helps or preserves your categories" passed={gateCounts.selected_team_category_fit} total={gateCounts.eligible_after_hard_filters} />
            <GateCount label="Partner has positive incentive" passed={gateCounts.counterparty_acceptance} total={gateCounts.eligible_after_hard_filters} />
            <GateCount label="Production value is balanced" passed={gateCounts.production_value_balance} total={gateCounts.eligible_after_hard_filters} />
            <GateCount label="Passes all three" passed={gateCounts.all_strict_gates} total={gateCounts.eligible_after_hard_filters} emphasized />
          </div>
        </div>
      )}
      {payload.teams.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Filter returned suggestions</p>
              <p className="mt-1 text-xs text-slate-500">
                {visibleCount} of {returnedSuggestions.length} returned suggestion{returnedSuggestions.length === 1 ? "" : "s"} shown
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
              onChange={setRecommendationFilter}
              options={[
                { value: "all", label: "All", count: returnedSuggestions.length },
                { value: "proposable", label: "Strict win-win", count: returnedSuggestions.filter((suggestion) => suggestion.suggestion_tier === "proposable").length },
                { value: "exploratory", label: "Exploratory", count: returnedSuggestions.filter((suggestion) => suggestion.suggestion_tier === "exploratory").length },
              ]}
            />
            <SuggestionFilterGroup
              label="Pick guidance"
              value={pickFilter}
              onChange={setPickFilter}
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
              onChange={setCapFilter}
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
      {payload.teams.length && filteredTeams.length ? (
        <div className="space-y-5 p-4">
          {filteredTeams.map((group) => (
            <div key={group.team.id}>
              <div className="mb-3 flex items-center gap-3">
                <TeamLogo league={payload.league.slug} logo={group.team.logo} name={group.team.name} size={38} />
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">{group.team.name}</h3>
                  <p className="text-xs text-slate-500">
                    {filtersActive ? `${group.suggestions.length} of ${group.counts.returned} suggestions shown` : `${group.counts.returned} suggested returns`}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={`${group.team.id}-${suggestion.trade.incoming.nba_id}`}
                    suggestion={suggestion}
                    onAnalyze={() => onAnalyze(suggestion)}
                  />
                ))}
              </div>
            </div>
          ))}
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

function gateReasonText(reason: string): string {
  const messages: Record<string, string> = {
    selected_team_fit_nonnegative: "The swap helps or preserves your category profile.",
    selected_team_category_tradeoff: "The swap reduces your overall category fit.",
    counterparty_acceptance_positive: "The partner has a positive measured incentive.",
    counterparty_acceptance_neutral: "The partner has no clear measured incentive.",
    counterparty_acceptance_negative: "The partner is projected to lose category utility.",
    counterparty_acceptance_blocked: "The partner is blocked by the current cap rules.",
    production_value_balanced: "Both sides retain the required production value.",
    both_sides_at_or_below_replacement: "Both players are at or below the free-agent replacement baseline.",
    replacement_impact_unavailable: "A trusted replacement-value baseline is unavailable.",
    replacement_value_unavailable: "A trusted replacement-value baseline is unavailable.",
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

function SuggestionCard({ suggestion, onAnalyze }: {
  suggestion: BalancedTradeSuggestion;
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
  return (
    <article className={`flex min-w-0 flex-col rounded-xl border p-4 ${proposable ? "border-emerald-200 dark:border-emerald-900" : "border-amber-200 dark:border-amber-900"}`}>
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
          {proposable ? "Strict win-win" : "Exploratory"}
        </span>
        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Fit {formatSigned(suggestion.selected_category_score)}</span>
      </div>
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
    replacement_impact_unavailable: "A trusted player-value comparison is not available for this result.",
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

function PartnerRankingResult({ payload, onExplore }: { payload: FantasyTradePartners; onExplore: (partner: TradePartner) => void }) {
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

function TradeAnalysisResult({ analysis, outgoing, incoming, league }: {
  analysis: FantasyTradeAnalysis;
  outgoing: FantasyPlayerPerformance | null;
  incoming: FantasyPlayerPerformance | null;
  league: LeagueSlug;
}) {
  return (
    <section className="mt-6 space-y-5">
      {analysis.fallback_reason && <FallbackBanner />}
      <VerdictBanner analysis={analysis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ExchangePlayer title="Outgoing" player={outgoing} fallback={analysis.trade.outgoing.name} league={league} />
        <ExchangePlayer title="Incoming" player={incoming} fallback={analysis.trade.incoming.name} league={league} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TeamImpact result={analysis.selected_team} league={league} primary />
        <TeamImpact result={analysis.counterparty_team} league={league} />
      </div>
      <PayrollComparison selected={analysis.selected_team} counterparty={analysis.counterparty_team} />
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

function PayrollComparison({ selected, counterparty }: { selected: TradeTeamResult; counterparty: TradeTeamResult }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Cap intelligence</p>
        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Five-year payroll impact</h2>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-2">
        <TeamPayrollTrade name={selected.team.name} payroll={selected.payroll} />
        <TeamPayrollTrade name={counterparty.team.name} payroll={counterparty.payroll} />
      </div>
    </div>
  );
}

function TeamPayrollTrade({ name, payroll }: { name: string; payroll: TradePayrollComparison }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <p className="truncate text-sm font-black text-slate-950 dark:text-white">{name}</p>
        <span className={`text-xs font-bold ${capTone(payroll.current_cap_result)}`}>{capResultLabel(payroll.current_cap_result)}</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {payroll.seasons.map((season) => (
          <div key={season.season} className="grid grid-cols-[70px_1fr_auto] items-center gap-2 px-3 py-2 text-xs">
            <span className="font-bold text-slate-500">{season.season}</span>
            <span className="text-right tabular-nums text-slate-500">{formatMoney(season.before.total)} → <strong className="text-slate-800 dark:text-slate-100">{formatMoney(season.after.total)}</strong></span>
            <span className={`min-w-20 text-right font-bold tabular-nums ${season.delta <= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatSignedMoney(season.delta)}</span>
          </div>
        ))}
      </div>
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

function ChipList({ label, values, tone }: { label: string; values: string[]; tone: "positive" | "danger" }) {
  if (!values.length) return null;
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">{values.map((value) => <span key={value} className={`rounded-md px-2 py-1 text-[10px] font-bold ${tone === "positive" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>{value}</span>)}</div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: TradePartner["confidence"] }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800">{confidence}</span>;
}

function FallbackBanner() {
  return <p className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">No qualifying recent games were available, so season performance was used.</p>;
}

function MethodNote({ children }: { children: React.ReactNode }) {
  return <p className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">{children}</p>;
}

function LoadingResult() {
  return <div className="mt-6 h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
}

function injuryText(player: FantasyPlayerPerformance) {
  if (!player.injury) return "";
  return [player.injury.body_part, player.injury.detail || player.injury.status].filter(Boolean).join(" · ");
}

function formatRank(value: number | null) {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatSignedMoney(value: number) {
  const amount = formatMoney(Math.abs(value));
  return value > 0 ? `+${amount}` : value < 0 ? `-${amount}` : "$0";
}

function basisLabel(basis: TradeBasis) {
  return basis === "season" ? "Season performance" : "Recent 14-day performance";
}

function phaseLabel(phase: "in_season" | "off_season") {
  return phase === "in_season" ? "In-season" : "Offseason";
}

function capResultLabel(result: TradeCapResult) {
  const labels: Record<TradeCapResult, string> = {
    unknown: "Cap unavailable",
    compliant: "Cap compliant",
    not_cap_compliant: "Not cap compliant",
    requires_additional_move: "Additional move required",
    clears_cap: "Moves under the cap",
    moves_toward_cap: "Moves toward the cap",
    moves_away_from_cap: "Moves away from the cap",
    crosses_over: "Moves over the cap",
    remains_under: "Remains under the cap",
  };
  return labels[result];
}

function capTone(result: TradeCapResult) {
  if (["compliant", "clears_cap", "moves_toward_cap", "remains_under"].includes(result)) return "text-emerald-600 dark:text-emerald-400";
  if (["not_cap_compliant", "requires_additional_move", "moves_away_from_cap", "crosses_over"].includes(result)) return "text-red-600 dark:text-red-400";
  return "text-amber-600 dark:text-amber-400";
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
