"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import type { TradeAnalyzerInitialState } from "@/components/FantasyTradeAnalyzerPage";
import {
  fetchAutomaticOneForTwoSuggestions,
  fetchBalancedTradeSuggestions,
  fetchFantasyTradeAnalysis,
  fetchFantasyTradePartners,
  photoUrl,
  type AutomaticTradePackageSuggestion,
  type BalancedTradeSuggestion,
  type FantasyAutomaticTradePackageSuggestions,
  type FantasyBalancedTradeSuggestions,
  type FantasyPlayerPerformance,
  type FantasyTradeAnalysis,
  type FantasyTradePartners,
  type TradeBasis,
  type TradeCapResult,
  type TradeCategoryChange,
  type TradePartner,
  type TradePackageCompletionOption,
  type TradePlayerSummary,
  type TradePayrollComparison,
  type TradeTeamResult,
  type TradeWarning,
} from "@/lib/api";

type LeagueSlug = "ldl" | "bdb";
type Mode = "suggestions" | "analyze" | "partners";
type SuggestionShape = "one_for_one" | "one_for_two";

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
  const [mode, setMode] = useState<Mode>(initialState.mode);
  const [basis, setBasis] = useState<TradeBasis>(initialState.basis);
  const [outgoing, setOutgoing] = useState(initialState.outgoing);
  const [incoming, setIncoming] = useState(initialState.incoming);
  const [partnerTeam, setPartnerTeam] = useState(initialState.partner);
  const [analysis, setAnalysis] = useState<FantasyTradeAnalysis | null>(null);
  const [partners, setPartners] = useState<FantasyTradePartners | null>(null);
  const [suggestions, setSuggestions] = useState<FantasyBalancedTradeSuggestions | null>(null);
  const [packageSuggestions, setPackageSuggestions] = useState<FantasyAutomaticTradePackageSuggestions | null>(null);
  const [suggestionShape, setSuggestionShape] = useState<SuggestionShape>("one_for_one");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableOwn = useMemo(
    () => ownPlayers
      .filter((player) => player.nba_id != null)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [ownPlayers],
  );
  const incomingPlayers = useMemo(
    () => leaguePlayers
      .filter((player) => (
        player.nba_id != null
        && player.fantasy_team?.id
        && player.fantasy_team.id !== teamId
        && (!partnerTeam || player.fantasy_team.id === partnerTeam)
      ))
      .sort((a, b) => {
        const teamOrder = (a.fantasy_team?.name ?? "").localeCompare(b.fantasy_team?.name ?? "");
        return teamOrder || a.name.localeCompare(b.name);
      }),
    [leaguePlayers, partnerTeam, teamId],
  );
  const outgoingPlayer = selectableOwn.find((player) => String(player.nba_id) === outgoing) ?? null;
  const incomingPlayer = leaguePlayers.find((player) => String(player.nba_id) === incoming) ?? null;
  const hasRecentGames = leaguePlayers.some((player) => player.window_stats.games > 0);

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
    setMode(next);
    setAnalysis(null);
    setPartners(null);
    setSuggestions(null);
    setPackageSuggestions(null);
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
    setOutgoing(value);
    setAnalysis(null);
    setPartners(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    setError(null);
    syncUrl({ outgoing: value });
    if (mode === "suggestions" && value) {
      void loadSuggestions(value, basis);
    }
  }

  function changeIncoming(value: string) {
    setIncoming(value);
    setAnalysis(null);
    setError(null);
    const selected = leaguePlayers.find((player) => String(player.nba_id) === value);
    const destination = selected?.fantasy_team?.id ?? partnerTeam;
    setPartnerTeam(destination);
    syncUrl({ incoming: value, partner: destination });
  }

  function changeBasis(value: TradeBasis) {
    setBasis(value);
    setAnalysis(null);
    setPartners(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    setError(null);
    syncUrl({ basis: value });
    if (mode === "suggestions" && outgoing) {
      void loadSuggestions(outgoing, value, suggestionShape);
    }
  }

  function changeSuggestionShape(next: SuggestionShape) {
    setSuggestionShape(next);
    setSuggestions(null);
    setPackageSuggestions(null);
    setError(null);
    if (outgoing) void loadSuggestions(outgoing, basis, next);
  }

  async function loadSuggestions(
    outgoingId: string,
    selectedBasis: TradeBasis,
    shape: SuggestionShape = suggestionShape,
  ) {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    try {
      if (shape === "one_for_two") {
        setPackageSuggestions(await fetchAutomaticOneForTwoSuggestions(
          league, teamId, Number(outgoingId), selectedBasis,
        ));
      } else {
        setSuggestions(await fetchBalancedTradeSuggestions(
          league, teamId, Number(outgoingId), selectedBasis,
        ));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The suggestions could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    if (!outgoing || (mode === "analyze" && !incoming)) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setPartners(null);
    try {
      if (mode === "partners") {
        setPartners(await fetchFantasyTradePartners(league, teamId, Number(outgoing), basis));
      } else if (mode === "suggestions") {
        if (suggestionShape === "one_for_two") {
          setPackageSuggestions(await fetchAutomaticOneForTwoSuggestions(
            league, teamId, Number(outgoing), basis,
          ));
        } else {
          setSuggestions(await fetchBalancedTradeSuggestions(league, teamId, Number(outgoing), basis));
        }
      } else {
        setAnalysis(await fetchFantasyTradeAnalysis(league, teamId, Number(outgoing), Number(incoming), basis));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The analysis could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeSuggestion(suggestion: BalancedTradeSuggestion) {
    const incomingId = suggestion.trade.incoming.nba_id;
    if (incomingId == null) return;
    setMode("analyze");
    setIncoming(String(incomingId));
    setPartnerTeam(suggestion.trade.counterparty_team_id);
    setSuggestions(null);
    setPackageSuggestions(null);
    setLoading(true);
    setError(null);
    syncUrl({
      mode: "analyze",
      incoming: String(incomingId),
      partner: suggestion.trade.counterparty_team_id,
    });
    try {
      setAnalysis(await fetchFantasyTradeAnalysis(
        league, teamId, Number(outgoing), incomingId, basis,
      ));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The analysis could not be completed.");
    } finally {
      setLoading(false);
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
    setMode("suggestions");
    setBasis("season");
    setOutgoing("");
    setIncoming("");
    setPartnerTeam("");
    setAnalysis(null);
    setPartners(null);
    setSuggestions(null);
    setPackageSuggestions(null);
    setSuggestionShape("one_for_one");
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
            <PlayerSelector
              label="You receive"
              helper={partnerTeam ? `Choose a return from ${incomingPlayers[0]?.fantasy_team?.name ?? "selected team"}` : "Rostered players on every other team"}
              value={incoming}
              players={incomingPlayers}
              onChange={changeIncoming}
              selected={incomingPlayer}
              grouped
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

        {mode === "suggestions" && (
          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Search shape</p>
              <p className="mt-0.5 text-xs text-slate-400">Start simple or explore a larger return package.</p>
            </div>
            <div className="flex w-full gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:w-fit">
              <ModeButton active={suggestionShape === "one_for_one"} onClick={() => changeSuggestionShape("one_for_one")}>1-for-1</ModeButton>
              <ModeButton active={suggestionShape === "one_for_two"} onClick={() => changeSuggestionShape("one_for_two")}>1-for-2</ModeButton>
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
    </>
  );
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
  const teams = grouped ? groupPlayers(players) : null;
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <label>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <span className="ml-2 text-xs text-slate-400">{helper}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
          <option value="">Select player…</option>
          {teams ? teams.map(([team, entries]) => (
            <optgroup key={team} label={team}>
              {entries.map((player) => <PlayerOption key={player.nba_id} player={player} showTeam />)}
            </optgroup>
          )) : players.map((player) => <PlayerOption key={player.nba_id} player={player} />)}
        </select>
      </label>
      {selected ? <SelectedPlayer player={selected} /> : <p className="mt-4 rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400 dark:bg-slate-800/60">No player selected</p>}
    </div>
  );
}

function PlayerOption({ player, showTeam = false }: { player: FantasyPlayerPerformance; showTeam?: boolean }) {
  return <option value={String(player.nba_id)}>{player.name} · {player.position || "—"}{showTeam ? ` · ${player.fantasy_team?.name ?? "Unknown team"}` : ""}</option>;
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
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{payload.summary.proposable} proposable</span>
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">{payload.summary.exploratory} exploratory</span>
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

function OneForTwoSuggestionCard({ suggestion, rank, league }: {
  suggestion: AutomaticTradePackageSuggestion;
  rank: number;
  league: LeagueSlug;
}) {
  const legalAsProposed = suggestion.completion_status === "legal_as_proposed";
  const drops = suggestion.completion_options.drop_candidates;
  const expansions = suggestion.completion_options.expanded_packages;
  const hasCompletion = drops.length > 0 || expansions.length > 0;
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
          <TierBadge tier={suggestion.recommendation_tier} />
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
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-5 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Balanced trade market</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Returns for {payload.outgoing.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payload.counts.returned} suggestions · {payload.teams.length} teams · {basisLabel(payload.basis_used)}
            </p>
          </div>
          <div className="flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{payload.counts.proposable} proposable</span>
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">{payload.counts.exploratory} exploratory</span>
          </div>
        </div>
      </div>
      {payload.fallback_reason && <FallbackBanner />}
      {payload.teams.length ? (
        <div className="space-y-5 p-4">
          {payload.teams.map((group) => (
            <div key={group.team.id}>
              <div className="mb-3 flex items-center gap-3">
                <TeamLogo league={payload.league.slug} logo={group.team.logo} name={group.team.name} size={38} />
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">{group.team.name}</h3>
                  <p className="text-xs text-slate-500">{group.counts.returned} suggested returns</p>
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
      ) : <SuggestionEmptyState payload={payload} />}
      <MethodNote>Balanced v1 · one-for-one trades · phase-aware cap rules · no category-strategy or draft-pick value applied yet.</MethodNote>
    </section>
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
          {proposable ? "Proposable" : "Exploratory"}
        </span>
        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Fit {formatSigned(suggestion.selected_category_score)}</span>
      </div>
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
      {suggestion.warnings.length > 0 && (
        <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">{suggestion.warnings.length} warning{suggestion.warnings.length === 1 ? "" : "s"} to review</p>
      )}
      <button type="button" onClick={onAnalyze} className="mt-auto pt-4">
        <span className="block rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-black text-white hover:bg-blue-700">Analyze this trade</span>
      </button>
    </article>
  );
}

function SuggestionEmptyState({ payload }: { payload: FantasyBalancedTradeSuggestions }) {
  return (
    <div className="m-4 rounded-xl border border-dashed border-slate-300 p-6 dark:border-slate-700">
      <h3 className="font-black text-slate-950 dark:text-white">No balanced one-for-one suggestions</h3>
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

function groupPlayers(players: FantasyPlayerPerformance[]) {
  const grouped = new Map<string, FantasyPlayerPerformance[]>();
  for (const player of players) {
    const name = player.fantasy_team?.name ?? "Unknown team";
    grouped.set(name, [...(grouped.get(name) ?? []), player]);
  }
  return [...grouped.entries()];
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
