"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import PlayerIdentityCell from "@/components/discovery/PlayerIdentityCell";
import MinutesTrendEvidence from "@/components/MinutesTrendEvidence";
import type {
  FantasyCategoryTargets,
  FantasyStrategySummary,
  FantasyTargetCandidate,
} from "@/lib/api";
import {
  discoveryLeagueLabel,
  type DiscoveryLeagueSlug,
} from "@/lib/discoveryLeagues";
import type { FantasySession } from "@/lib/fantasySessionTypes";
import { upsertWatchlistEntry, removeWatchlistEntry } from "@/lib/watchlistClient";
import { PLAYER_POSITION_OPTIONS } from "@/lib/categoryTargetDiscovery";
import { CATEGORY_LABELS } from "@/lib/teamCategoryStrategy";

const PAGE_SIZE = 24;

type StrategyClassification = "TARGET" | "PROTECT" | "FLEX" | "PUNT_CANDIDATE";
type Availability = "all" | "free_agent" | "rostered";
type Basis = "season" | "window";
type ActionScope = "ready" | "all";
type CapScope = "all" | "known_fit";

type TeamContext =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "mismatch"; requested: string }
  | { kind: "ready"; teamId: string; teamName: string };

function groupStrategy(summary: FantasyStrategySummary | undefined) {
  const groups: Record<StrategyClassification, FantasyStrategySummary["categories"]> = {
    TARGET: [],
    PROTECT: [],
    FLEX: [],
    PUNT_CANDIDATE: [],
  };
  for (const row of summary?.categories ?? []) {
    const classification = row.classification as StrategyClassification;
    if (groups[classification]) groups[classification].push(row);
  }
  return groups;
}

function classificationForCategory(
  summary: FantasyStrategySummary | undefined,
  categoryKey: string,
): StrategyClassification | null {
  const row = summary?.categories.find((item) => item.key === categoryKey);
  return (row?.classification as StrategyClassification | undefined) ?? null;
}

function actionabilityLabel(
  status: NonNullable<FantasyTargetCandidate["actionability"]>["status"],
  league: DiscoveryLeagueSlug,
): string {
  if (status === "ready") return "Ready";
  if (status === "requires_move") {
    return league === "gnfc" ? "Needs roster change" : "Needs roster / cap / tokens";
  }
  if (status === "needs_review") return "Needs review";
  return "Statistical only";
}

function ChipRow({
  label,
  values,
  tone,
}: {
  label: string;
  values: string[];
  tone: "positive" | "negative" | "neutral";
}) {
  if (!values.length) return null;
  const toneClass = tone === "positive"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    : tone === "negative"
      ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return (
    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 sm:mt-0">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <span key={`${label}-${value}`} className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${toneClass}`}>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function candidateKey(player: FantasyTargetCandidate): string {
  return `${player.availability}-${player.nba_id}`;
}

function appendUniqueCandidates(
  current: FantasyTargetCandidate[],
  next: FantasyTargetCandidate[],
): FantasyTargetCandidate[] {
  const seen = new Set(current.map(candidateKey));
  const appended = next.filter((player) => {
    const key = candidateKey(player);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...current, ...appended];
}

function StrategySummaryPanel({
  summary,
  secondaryOpen,
  onToggleSecondary,
}: {
  summary: FantasyStrategySummary | undefined;
  secondaryOpen: boolean;
  onToggleSecondary: () => void;
}) {
  const groups = groupStrategy(summary);
  return (
    <section
      data-testid="fit-strategy-summary"
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
        System Recommended Strategy
      </p>
      <div className="mt-3">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Target</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="fit-strategy-targets">
          {groups.TARGET.length ? groups.TARGET.map((row) => (
            <span
              key={row.key}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white dark:bg-blue-500"
            >
              {row.label}
            </span>
          )) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              No TARGET categories — automatic needs stay empty.
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleSecondary}
        className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        data-testid="fit-strategy-secondary-toggle"
      >
        {secondaryOpen ? "Hide Protect / Flex / Punt" : "Show Protect / Flex / Punt"}
      </button>
      {secondaryOpen ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3" data-testid="fit-strategy-secondary">
          {([
            ["Protect", groups.PROTECT],
            ["Flex", groups.FLEX],
            ["Punt candidate", groups.PUNT_CANDIDATE],
          ] as const).map(([title, rows]) => (
            <div key={title}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {rows.length ? rows.map((row) => (
                  <span
                    key={row.key}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {row.label}
                  </span>
                )) : (
                  <span className="text-xs text-slate-400">None</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FitCandidateCard({
  league,
  player,
  watched,
  onWatchChange,
}: {
  league: DiscoveryLeagueSlug;
  player: FantasyTargetCandidate;
  watched: boolean;
  onWatchChange: (nbaId: number, next: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionability = player.availability === "free_agent" ? player.actionability : undefined;
  const intelligenceHref = player.player_id
    ? `/players/${player.player_id}?league=${league}&from=fit`
    : null;
  const movesHref = `/fantasy/${league}/my-team`;
  const tradeHref = league === "gnfc"
    ? null
    : `/fantasy/${league}/roster/${encodeURIComponent(player.fantasy_team?.id ?? player.fantasy_team?.team_id ?? "")}/trade`;

  async function toggleWatch() {
    setBusy(true);
    setError(null);
    try {
      const res = watched
        ? await removeWatchlistEntry(league, player.nba_id)
        : await upsertWatchlistEntry(league, { nbaPlayerId: player.nba_id, priority: 2 });
      if (!res.ok) throw new Error(watched ? "Could not unwatch" : "Could not watch");
      onWatchChange(player.nba_id, !watched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Watch action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      data-testid="fit-candidate"
      className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-3 sm:py-2"
    >
      <div className="flex flex-col gap-2 sm:gap-1.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            <PlayerIdentityCell
              name={player.name}
              photo={player.photo}
              nbaId={player.nba_id}
              position={player.position}
              nbaTeam={player.nba_team_short || player.nba_team}
              injury={Boolean(player.injury)}
              size="md"
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-1">
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                player.availability === "free_agent"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              }`}>
                {player.availability === "free_agent"
                  ? "Free agent"
                  : player.fantasy_team?.name ?? "Trade target"}
              </span>
              {actionability ? (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {actionabilityLabel(actionability.status, league)}
                </span>
              ) : null}
              <span className="text-[11px] font-medium capitalize text-slate-500 dark:text-slate-400">
                {player.confidence} confidence
                {player.fit_explanation?.sample_games != null
                  ? ` · ${player.fit_explanation.sample_games} games`
                  : ""}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {intelligenceHref ? (
              <Link
                href={intelligenceHref}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Open
              </Link>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleWatch()}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              data-testid="fit-watch"
            >
              {watched ? "Watching" : "Watch"}
            </button>
            <Link
              href={movesHref}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
            >
              Moves
            </Link>
            {player.availability === "rostered" && tradeHref && (player.fantasy_team?.id || player.fantasy_team?.team_id) ? (
              <Link
                href={tradeHref}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
              >
                Trade
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-0 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4 sm:gap-y-1">
          <ChipRow label="Helps" values={player.helps} tone="positive" />
          <ChipRow label="Trade-offs" values={player.tradeoffs} tone="negative" />
          {league === "gnfc" && player.availability === "free_agent" ? (
            <div className="mt-1 sm:mt-0">
              <MinutesTrendEvidence trend={player.minutes_trend} />
            </div>
          ) : null}
          <details className="mt-1.5 sm:mt-0">
            <summary className="cursor-pointer text-xs font-bold text-blue-700 dark:text-blue-300">
              Evidence details
            </summary>
            {player.need_contributions?.length ? (
              <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                {player.need_contributions.map((item) => (
                  <li key={item.key} className="flex justify-between gap-2">
                    <span>{item.label}</span>
                    <span className="tabular-nums font-bold">
                      {item.player_z >= 0 ? "+" : ""}{item.player_z.toFixed(2)}z
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {typeof player.fit_score === "number" ? (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400" data-testid="fit-need-weighted-z">
                Need-weighted z {player.fit_score >= 0 ? "+" : ""}{player.fit_score.toFixed(2)}
                {player.fit_rank != null ? ` · rank #${player.fit_rank}` : ""}
              </p>
            ) : null}
            {league !== "gnfc" && player.salary_2026_27 ? (
              <p className="mt-1 text-xs text-slate-500">2026–27 salary {player.salary_2026_27}</p>
            ) : null}
          </details>
        </div>
      </div>
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p> : null}
    </article>
  );
}

export default function DiscoveryFitView({
  league,
}: {
  league: DiscoveryLeagueSlug;
}) {
  const searchParams = useSearchParams();
  const urlTeam = searchParams.get("team");
  const [teamContext, setTeamContext] = useState<TeamContext>({ kind: "loading" });
  const [targets, setTargets] = useState<FantasyCategoryTargets | null>(null);
  const [visibleCandidates, setVisibleCandidates] = useState<FantasyTargetCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [basis, setBasis] = useState<Basis>("season");
  const [availability, setAvailability] = useState<Availability>(
    league === "gnfc" ? "free_agent" : "all",
  );
  const [position, setPosition] = useState("");
  const [actionScope, setActionScope] = useState<ActionScope>("all");
  const [capScope, setCapScope] = useState<CapScope>("all");
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const requestSequence = useRef(0);
  const readyTeamId = teamContext.kind === "ready" ? teamContext.teamId : null;
  const targetsFetchKey = readyTeamId
    ? [
      league,
      readyTeamId,
      basis,
      availability,
      category,
      position,
      actionScope,
      league === "gnfc" ? "all" : capScope,
    ].join("|")
    : null;
  const [activeTargetsFetchKey, setActiveTargetsFetchKey] = useState<string | null>(null);

  // Match LeaguePlayerExplorer: adjust loading UI during render when the fetch identity changes,
  // so the effect body never calls setState synchronously.
  if (targetsFetchKey && targetsFetchKey !== activeTargetsFetchKey) {
    setActiveTargetsFetchKey(targetsFetchKey);
    setLoading(true);
    setLoadingMore(false);
    setLoadMoreError(false);
    setError(null);
    setUnavailable(null);
  }

  function buildTargetParams(offset = 0) {
    const params = new URLSearchParams({
      basis,
      window: "14",
      availability,
      limit: String(PAGE_SIZE),
      offset: String(offset),
      action_scope: actionScope,
      cap_scope: league === "gnfc" ? "all" : capScope,
    });
    if (category) params.set("category", category);
    if (position) params.set("position", position);
    return params;
  }

  useEffect(() => {
    let cancelled = false;
    // Initial state is already "loading"; remount via parent key resets on league/team change.
    void (async () => {
      try {
        const res = await fetch("/api/fantasy/session", { cache: "no-store" });
        if (!res.ok) throw new Error("session");
        const session = await res.json() as FantasySession;
        if (cancelled) return;
        const membership = session.memberships.find((item) => item.league_slug === league);
        const teamId = membership?.fantrax_team_id ?? null;
        if (!teamId) {
          setTeamContext({ kind: "missing" });
          return;
        }
        if (urlTeam && urlTeam !== teamId) {
          setTeamContext({ kind: "mismatch", requested: urlTeam });
          return;
        }
        setTeamContext({
          kind: "ready",
          teamId,
          teamName: membership?.franchise_name ?? "Your team",
        });
      } catch {
        if (!cancelled) setTeamContext({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [league, urlTeam]);

  useEffect(() => {
    if (!targetsFetchKey || !readyTeamId) return;
    const requestId = ++requestSequence.current;
    let cancelled = false;
    const params = buildTargetParams(0);
    void (async () => {
      try {
        const res = await fetch(
          `/api/fantasy/${league}/roster/${encodeURIComponent(readyTeamId)}/targets?${params}`,
          { cache: "no-store" },
        );
        if (cancelled || requestId !== requestSequence.current) return;
        if (res.status === 503) {
          setUnavailable("Free-agent market data is not ready for this league yet.");
          setTargets(null);
          setVisibleCandidates([]);
          return;
        }
        if (!res.ok) throw new Error("Failed to load Fit candidates");
        const data = await res.json() as FantasyCategoryTargets;
        if (cancelled || requestId !== requestSequence.current) return;
        setTargets(data);
        setVisibleCandidates(data.candidates);
      } catch (err) {
        if (cancelled || requestId !== requestSequence.current) return;
        setError(err instanceof Error ? err.message : "Failed to load Fit");
        setTargets(null);
        setVisibleCandidates([]);
      } finally {
        if (!cancelled && requestId === requestSequence.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  // Filter values are captured in targetsFetchKey / params at effect start.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsFetchKey, readyTeamId, league]);

  async function loadMoreCandidates() {
    if (teamContext.kind !== "ready" || !targets || loading || loadingMore) return;
    const total = targets.sample.filtered_candidates;
    if (visibleCandidates.length >= total) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    const requestId = requestSequence.current;
    const offset = visibleCandidates.length;
    try {
      const params = buildTargetParams(offset);
      const res = await fetch(
        `/api/fantasy/${league}/roster/${encodeURIComponent(teamContext.teamId)}/targets?${params}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error();
      const nextPage = await res.json() as FantasyCategoryTargets;
      if (requestId !== requestSequence.current) return;
      if (
        (nextPage.filters.offset ?? 0) !== offset
        || !nextPage.candidates.length
        || (targets.snapshot?.generated_at && nextPage.snapshot?.generated_at
          && targets.snapshot.generated_at !== nextPage.snapshot.generated_at)
      ) {
        throw new Error();
      }
      setVisibleCandidates((current) => appendUniqueCandidates(current, nextPage.candidates));
      setTargets((current) => (current ? {
        ...current,
        sample: {
          ...current.sample,
          filtered_candidates: nextPage.sample.filtered_candidates,
        },
      } : current));
    } catch {
      if (requestId === requestSequence.current) setLoadMoreError(true);
    } finally {
      if (requestId === requestSequence.current) setLoadingMore(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/watchlist/${league}?window=7`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json() as { entries?: Array<{ nba_player_id: number }> };
        if (cancelled) return;
        setWatchedIds(new Set((data.entries ?? []).map((e) => e.nba_player_id)));
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [league]);

  const leagueCategories = targets?.league.categories
    ?? Object.keys(CATEGORY_LABELS);
  const strategyClassification = classificationForCategory(
    targets?.strategy_summary,
    category,
  );
  const automaticMode = !category;
  const filteredTotal = targets?.sample.filtered_candidates ?? 0;
  const hasMoreCandidates = visibleCandidates.length < filteredTotal;
  const optimizingLabels = useMemo(
    () => (targets?.needs ?? []).map((need) => need.label),
    [targets],
  );

  if (teamContext.kind === "loading") {
    return (
      <section data-testid="discovery-fit">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Resolving your team…
        </div>
      </section>
    );
  }

  if (teamContext.kind === "missing") {
    return (
      <section data-testid="discovery-fit">
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center dark:border-amber-900 dark:bg-amber-950/30"
          data-testid="fit-no-team"
        >
          <p className="text-base font-bold text-amber-950 dark:text-amber-100">
            No personal team is available for this league.
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            Fit to my plan needs your mapped fantasy team. No team context was invented.
          </p>
        </div>
      </section>
    );
  }

  if (teamContext.kind === "mismatch") {
    return (
      <section data-testid="discovery-fit">
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-8 text-center dark:border-rose-900 dark:bg-rose-950/30"
          data-testid="fit-team-mismatch"
        >
          <p className="text-base font-bold text-rose-900 dark:text-rose-100">
            That team is not your personal team for this league.
          </p>
          <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">
            Fit stays personal-team only. Requested team id: {teamContext.requested}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="discovery-fit" className="space-y-3">
      <div data-testid="fit-team-context">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Fit to my plan
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {teamContext.teamName} · {discoveryLeagueLabel(league)}
        </p>
      </div>

      {unavailable ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center dark:border-amber-900 dark:bg-amber-950/30"
          data-testid="fit-not-ready"
        >
          <p className="text-base font-bold text-amber-950 dark:text-amber-100">{unavailable}</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {!unavailable && targets ? (
        <>
          <StrategySummaryPanel
            summary={targets.strategy_summary}
            secondaryOpen={secondaryOpen}
            onToggleSecondary={() => setSecondaryOpen((open) => !open)}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex min-w-[14rem] flex-col gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              Explore a specific category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                data-testid="fit-category"
              >
                <option value="">Automatic plan / Recommended targets</option>
                {leagueCategories.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key] ?? key}
                  </option>
                ))}
              </select>
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as Availability)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              aria-label="Availability"
            >
              <option value="all">All players</option>
              <option value="free_agent">Free agents</option>
              <option value="rostered">Rostered / trade targets</option>
            </select>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              aria-label="Position"
            >
              <option value="">All positions</option>
              {PLAYER_POSITION_OPTIONS.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            {league !== "gnfc" ? (
              <select
                value={basis}
                onChange={(e) => setBasis(e.target.value as Basis)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                aria-label="Scoring basis"
              >
                <option value="season">Season basis</option>
                <option value="window">Recent window</option>
              </select>
            ) : null}
            <select
              value={actionScope}
              onChange={(e) => setActionScope(e.target.value as ActionScope)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              aria-label="Action scope"
            >
              <option value="all">All actionability</option>
              <option value="ready">Ready only</option>
            </select>
            {league !== "gnfc" ? (
              <select
                value={capScope}
                onChange={(e) => setCapScope(e.target.value as CapScope)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                aria-label="Cap scope"
                data-testid="fit-cap-scope"
              >
                <option value="all">All cap outcomes</option>
                <option value="known_fit">Known cap fit</option>
              </select>
            ) : null}
            {!automaticMode ? (
              <button
                type="button"
                onClick={() => setCategory("")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                data-testid="fit-back-automatic"
              >
                Back to Automatic plan
              </button>
            ) : null}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400" data-testid="fit-mode-status">
            {automaticMode
              ? optimizingLabels.length
                ? `Automatic plan · Optimizing for: ${optimizingLabels.join(", ")}`
                : "Automatic plan · No TARGET categories — no automatic needs"
              : (
                <>
                  Exploring: {CATEGORY_LABELS[category] ?? category}
                  {strategyClassification === "PUNT_CANDIDATE"
                    ? " · Punt candidate in your recommended strategy"
                    : ""}
                  {" · Explicit category exploration (strategy unchanged)"}
                </>
              )}
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400" data-testid="fit-results-status">
            {loading
              ? "Loading candidates…"
              : `Showing ${visibleCandidates.length} of ${filteredTotal} candidates`}
          </p>

          {loading && !visibleCandidates.length ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Loading Fit candidates…
            </div>
          ) : visibleCandidates.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No candidates match this plan and filters.
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-1.5" data-testid="fit-candidate-list">
              {visibleCandidates.map((player) => (
                <FitCandidateCard
                  key={candidateKey(player)}
                  league={league}
                  player={player}
                  watched={watchedIds.has(player.nba_id)}
                  onWatchChange={(nbaId, next) => {
                    setWatchedIds((prev) => {
                      const copy = new Set(prev);
                      if (next) copy.add(nbaId);
                      else copy.delete(nbaId);
                      return copy;
                    });
                  }}
                />
              ))}
            </div>
          )}

          {hasMoreCandidates ? (
            <button
              type="button"
              disabled={loading || loadingMore}
              onClick={() => void loadMoreCandidates()}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              data-testid="fit-load-more"
            >
              {loadingMore
                ? "Loading more…"
                : `Load more (${visibleCandidates.length} of ${filteredTotal} shown)`}
            </button>
          ) : null}
          {loadMoreError ? (
            <p role="alert" className="text-center text-sm font-semibold text-rose-600 dark:text-rose-400">
              More candidates could not be loaded. Retry, or change filters if results changed.
            </p>
          ) : null}
        </>
      ) : null}

      {!unavailable && !targets && loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Loading Fit to my plan…
        </div>
      ) : null}
    </section>
  );
}
