"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import type { TradeAnalyzerInitialState } from "@/components/FantasyTradeAnalyzerPage";
import {
  fetchFantasyTradeAnalysis,
  fetchFantasyTradePartners,
  photoUrl,
  type FantasyPlayerPerformance,
  type FantasyTradeAnalysis,
  type FantasyTradePartners,
  type TradeBasis,
  type TradeCapResult,
  type TradeCategoryChange,
  type TradePartner,
  type TradePayrollComparison,
  type TradeTeamResult,
  type TradeWarning,
} from "@/lib/api";

type LeagueSlug = "ldl" | "bdb";
type Mode = "analyze" | "partners";

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
    setError(null);
    if (next === "partners") {
      setIncoming("");
      setPartnerTeam("");
      syncUrl({ mode: next, incoming: "", partner: "" });
    } else {
      syncUrl({ mode: next });
    }
  }

  function changeOutgoing(value: string) {
    setOutgoing(value);
    setAnalysis(null);
    setPartners(null);
    setError(null);
    syncUrl({ outgoing: value });
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
    setError(null);
    syncUrl({ basis: value });
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
      } else {
        setAnalysis(await fetchFantasyTradeAnalysis(league, teamId, Number(outgoing), Number(incoming), basis));
      }
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
    setMode("analyze");
    setBasis("season");
    setOutgoing("");
    setIncoming("");
    setPartnerTeam("");
    setAnalysis(null);
    setPartners(null);
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
          <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <ModeButton active={mode === "analyze"} onClick={() => changeMode("analyze")}>Analyze trade</ModeButton>
            <ModeButton active={mode === "partners"} onClick={() => changeMode("partners")}>Find trade partners</ModeButton>
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
          ) : (
            <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-5 dark:border-blue-800 dark:bg-blue-950/20">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Market discovery</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Who needs this player most?</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Teams are ranked by category fit and a conservative cap screen. No return player or return salary is assumed yet.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {mode === "analyze"
              ? "The final result simulates both teams and applies the configured season cap policy."
              : "Destination fit is directional. Select a team afterward to evaluate an exact return."}
          </p>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading || !outgoing || (mode === "analyze" && !incoming)}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            {loading ? "Analyzing…" : mode === "analyze" ? "Analyze trade" : "Rank destination teams"}
          </button>
        </div>
      </section>

      {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {loading && <LoadingResult />}
      {analysis && <TradeAnalysisResult analysis={analysis} outgoing={outgoingPlayer} incoming={incomingPlayer} league={league} />}
      {partners && <PartnerRankingResult payload={partners} onExplore={exploreReturns} />}
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
