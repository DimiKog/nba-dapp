"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  fetchFantasyWatchlist,
  fetchLeaguePlayerExplorer,
  photoUrl,
  type FantasyPlayerPerformance,
  type FantasyPlayerStats,
  type LeaguePlayerExplorer as ExplorerPayload,
} from "@/lib/api";
import {
  getServerLeagueSnapshot,
  getStoredLeagueSnapshot,
  leagueLabel,
  LEAGUE_SLUGS,
  resolveClientLeague,
  storeLeague,
  subscribeLeagueStore,
  type LeagueSlug,
} from "@/lib/leagues";
import TeamLogo from "@/components/TeamLogo";
import { ReviewedInjuryNotice } from "@/components/ReviewedInjuryReport";
import PlayerIdentityCell from "@/components/discovery/PlayerIdentityCell";
import {
  formatBrowseCacheHint,
  formatBrowseMetadata,
} from "@/lib/browsePresentation";
import { upsertWatchlistEntry } from "@/lib/watchlistClient";

import {
  fantasyStatValue,
  formatFantasyStat,
  resolveFantasyCategories,
  type FantasyCategory,
  type FantasyCategoryKey,
} from "@/lib/fantasyCategories";

type StatsView = "season" | "window";
type Availability = "all" | "free_agent" | "rostered";
type FreeAgentScope = "ranked" | "current_or_recent" | "all_known";
type Direction = "asc" | "desc";
type SortKey = "rank" | "name" | "fantasy_team" | "salary" | FantasyCategoryKey;

const SALARY_SEASONS = ["2026-27", "2027-28", "2028-29", "2029-30", "2030-31"] as const;
const PAGE_SIZE = 40;

function explorerPlayersHref(searchParams: URLSearchParams, league: LeagueSlug): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set("league", league);
  const query = params.toString();
  return query ? `/players?${query}` : `/players?league=${league}`;
}

export default function LeaguePlayerExplorer({
  embedded = false,
}: {
  /** When true, Discovery shell owns page chrome / league tabs — keep Explorer body only. */
  embedded?: boolean;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlLeague = searchParams.get("league");
  const storedLeague = useSyncExternalStore(
    subscribeLeagueStore,
    getStoredLeagueSnapshot,
    getServerLeagueSnapshot,
  );
  const league = resolveClientLeague(urlLeague, storedLeague);
  const [payload, setPayload] = useState<ExplorerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("all");
  const [availability, setAvailability] = useState<Availability>("all");
  const [freeAgentScope, setFreeAgentScope] = useState<FreeAgentScope>("current_or_recent");
  const [position, setPosition] = useState("all");
  const [status, setStatus] = useState("all");
  const [statsView, setStatsView] = useState<StatsView>("season");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [direction, setDirection] = useState<Direction>("asc");
  const [expandedId, setExpandedId] = useState("");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [hasFantasyAccess, setHasFantasyAccess] = useState(false);
  const [watchPending, setWatchPending] = useState<number | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [filterLeague, setFilterLeague] = useState(league);
  const lastRefresh = useRef(0);
  const requestId = useRef(0);

  if (league !== filterLeague) {
    setFilterLeague(league);
    setLoading(true);
    setError(null);
    setPayload(null);
    setQuery("");
    setTeam("all");
    setAvailability("all");
    setFreeAgentScope("current_or_recent");
    setPosition("all");
    setStatus("all");
    setExpandedId("");
    setComparisonIds([]);
    setWatchedIds(new Set());
    setHasFantasyAccess(false);
    setWatchError(null);
    setVisibleLimit(PAGE_SIZE);
  }

  useEffect(() => {
    let active = true;
    const currentRequest = ++requestId.current;
    lastRefresh.current = Date.now();
    Promise.all([
      fetchLeaguePlayerExplorer(league),
      fetchFantasyWatchlist(league).catch(() => null),
    ])
      .then(([data, watchlist]) => {
        if (!active || currentRequest !== requestId.current) return;
        setPayload(data);
        setHasFantasyAccess(Boolean(watchlist));
        setWatchedIds(new Set(
          watchlist?.entries.map((entry) => entry.nba_player_id) ?? [],
        ));
        setStatsView(data.ranking_basis);
        setExpandedId("");
        lastRefresh.current = Date.now();
      })
      .catch(() => {
        if (active && currentRequest === requestId.current) setError(`Could not load ${leagueLabel(league)} players.`);
      })
      .finally(() => {
        if (active && currentRequest === requestId.current) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [league]);

  const refreshPlayers = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      const data = await fetchLeaguePlayerExplorer(league);
      if (currentRequest !== requestId.current) return;
      setPayload(data);
      setError(null);
      lastRefresh.current = Date.now();
    } catch {
      if (currentRequest === requestId.current) setError(`Could not refresh ${leagueLabel(league)} players.`);
    }
  }, [league]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh.current < 60_000) return;
      lastRefresh.current = Date.now();
      void refreshPlayers();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshPlayers]);

  useEffect(() => {
    storeLeague(league);
    if (embedded) return;
    if (urlLeague !== league) {
      router.replace(explorerPlayersHref(searchParams, league), { scroll: false });
    }
  }, [league, router, urlLeague, embedded, searchParams]);

  function changeLeague(next: LeagueSlug) {
    if (next === league) return;
    router.replace(explorerPlayersHref(searchParams, next), { scroll: false });
  }

  const filterKey = [
    query, team, availability, freeAgentScope, position, status, sortKey, direction, statsView,
  ].join("|");
  const [limitKey, setLimitKey] = useState(filterKey);
  if (filterKey !== limitKey) {
    setLimitKey(filterKey);
    setVisibleLimit(PAGE_SIZE);
  }

  const positions = useMemo(() => {
    const result = new Set<string>();
    payload?.players.forEach((player) => {
      player.position.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => result.add(item));
    });
    return [...result].sort();
  }, [payload]);

  const filtered = useMemo(() => {
    if (!payload) return [];
    const normalized = query.trim().toLowerCase();
    return payload.players.filter((player) => {
      const searchable = [
        player.name,
        player.nba_team,
        player.nba_status?.club,
        player.fantasy_team?.name,
        player.position,
      ].join(" ").toLowerCase();
      return (!normalized || searchable.includes(normalized))
        && (availability === "all" || playerAvailability(player) === availability)
        && (
          availability !== "free_agent"
          || freeAgentScope === "all_known"
          || (freeAgentScope === "ranked" && player.availability_rank != null)
          || (freeAgentScope === "current_or_recent" && player.nba_relevance === "current_or_recent")
        )
        && (team === "all" || player.fantasy_team?.id === team)
        && (position === "all" || player.position.split(",").map((item) => item.trim()).includes(position))
        && statusMatches(player, status);
    });
  }, [availability, freeAgentScope, payload, position, query, status, team]);

  const ordered = useMemo(() => {
    return [...filtered].sort((a, b) => comparePlayers(a, b, sortKey, direction, statsView));
  }, [direction, filtered, sortKey, statsView]);
  const categoryColumns = useMemo(
    () => resolveFantasyCategories(payload?.categories ?? []),
    [payload],
  );
  const visiblePlayers = ordered.slice(0, visibleLimit);
  const remainingPlayers = ordered.length - visiblePlayers.length;
  const injuredCount = filtered.filter((player) => player.injury).length;
  const freeAgentCount = filtered.filter((player) => playerAvailability(player) === "free_agent").length;
  const hasWindowGames = payload?.players.some((player) => player.window_stats.games > 0) ?? false;

  function changeSort(next: SortKey) {
    if (next === sortKey) {
      setDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(next);
    setDirection(next === "rank" || next === "name" || next === "fantasy_team" || next === "turnovers" ? "asc" : "desc");
  }

  function changeAvailability(next: Availability) {
    setAvailability(next);
    if (next === "free_agent") setTeam("all");
  }

  function toggleComparison(player: FantasyPlayerPerformance) {
    const key = playerKey(player);
    setComparisonIds((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= 4) return current;
      return [...current, key];
    });
  }

  async function watchPlayer(player: FantasyPlayerPerformance) {
    if (!player.nba_id || watchedIds.has(player.nba_id)) return;
    setWatchPending(player.nba_id);
    setWatchError(null);
    try {
      const response = await upsertWatchlistEntry(league, {
        nbaPlayerId: player.nba_id,
        notes: "",
        priority: 2,
      });
      if (!response.ok) throw new Error();
      setWatchedIds((current) => new Set(current).add(player.nba_id!));
    } catch {
      setWatchError("Could not add this player to the watchlist.");
    } finally {
      setWatchPending(null);
    }
  }

  const comparisonPlayers = comparisonIds
    .map((id) => payload?.players.find((player) => playerKey(player) === id))
    .filter((player): player is FantasyPlayerPerformance => Boolean(player));
  const comparisonHref = buildComparisonHref(league, comparisonIds);
  const cacheHint = payload ? formatBrowseCacheHint(payload.snapshot.captured_at) : null;

  const shellClassName = embedded
    ? "w-full min-w-0"
    : "mx-auto w-full min-w-0 max-w-[1500px] px-4 py-8";

  return (
    <div className={shellClassName}>
      {!embedded && (
        <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Fantasy intelligence</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Player Explorer</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Search and rank rostered players and fantasy free agents by category, performance and contract.
            </p>
          </div>
          <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {LEAGUE_SLUGS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => changeLeague(item)}
                className={`rounded-lg px-6 py-2 text-sm font-bold transition-colors ${
                  league === item
                    ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {leagueLabel(item)}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <ExplorerLoading />}
      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      {watchError && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {watchError}
        </div>
      )}

      {!loading && payload && (
        <>
          <BrowseToolbar
            query={query}
            onQueryChange={setQuery}
            team={team}
            onTeamChange={setTeam}
            position={position}
            onPositionChange={setPosition}
            status={status}
            onStatusChange={setStatus}
            availability={availability}
            onAvailabilityChange={changeAvailability}
            statsView={statsView}
            onStatsViewChange={setStatsView}
            freeAgentScope={freeAgentScope}
            onFreeAgentScopeChange={setFreeAgentScope}
            teams={payload.teams}
            positions={positions}
            windowDays={payload.window.days}
            hasWindowGames={hasWindowGames}
            faCounts={payload.counts}
            onRefresh={() => void refreshPlayers()}
            refreshing={loading}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              {formatBrowseMetadata({
                visiblePlayers: ordered.length,
                freeAgentsInView: freeAgentCount,
                injuryAlertsInView: injuredCount,
                basis: statsView,
                windowDays: payload.window.days,
                season: payload.window.season,
              })}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {cacheHint && <span>{cacheHint}</span>}
              <span>
                {ordered.length === 0
                  ? "0 results"
                  : `Showing ${visiblePlayers.length} of ${ordered.length}`}
              </span>
            </div>
          </div>

          <section className="mt-3 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-2 p-2 md:hidden">
              {visiblePlayers.map((player) => (
                <ExplorerMobileCard
                  key={`${player.fantasy_team?.id}-${playerKey(player)}`}
                  player={player}
                  league={league}
                  statsView={statsView}
                  categories={categoryColumns}
                  expanded={playerKey(player) === expandedId}
                  compared={comparisonIds.includes(playerKey(player))}
                  comparisonFull={!comparisonIds.includes(playerKey(player)) && comparisonIds.length >= 4}
                  watched={Boolean(player.nba_id && watchedIds.has(player.nba_id))}
                  watchPending={watchPending === player.nba_id}
                  hasFantasyAccess={hasFantasyAccess}
                  windowDays={payload.window.days}
                  onToggleExpand={() => setExpandedId((current) => current === playerKey(player) ? "" : playerKey(player))}
                  onCompare={() => toggleComparison(player)}
                  onWatch={() => watchPlayer(player)}
                />
              ))}
            </div>

            <div className="hidden max-w-full overflow-x-auto md:block">
              <table className="min-w-[1280px] w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                  <tr>
                    <SortableHeader label="#" sort="rank" active={sortKey} direction={direction} onSort={changeSort} className="w-12 text-center" />
                    <SortableHeader label="Player" sort="name" active={sortKey} direction={direction} onSort={changeSort} className="sticky left-0 z-20 min-w-56 bg-slate-50 text-left dark:bg-slate-800" />
                    <SortableHeader label="Status" sort="fantasy_team" active={sortKey} direction={direction} onSort={changeSort} className="min-w-40 text-left" />
                    <SortableHeader label="2026–27" sort="salary" active={sortKey} direction={direction} onSort={changeSort} className="min-w-24 text-right" />
                    <th className="min-w-14 px-3 py-2.5 text-right">GP</th>
                    {categoryColumns.map((category) => (
                      <SortableHeader
                        key={category.key}
                        label={category.label}
                        sort={category.key}
                        active={sortKey}
                        direction={direction}
                        onSort={changeSort}
                        className="min-w-14 text-right"
                      />
                    ))}
                    <th className="w-16 px-2 py-2.5 text-center">Watch</th>
                    <th className="w-16 px-2 py-2.5 text-center">Compare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visiblePlayers.map((player) => {
                    const key = playerKey(player);
                    return (
                      <BrowseDesktopRows
                        key={`${player.fantasy_team?.id}-${key}`}
                        player={player}
                        league={league}
                        stats={statsFor(player, statsView)}
                        statsView={statsView}
                        categories={categoryColumns}
                        expanded={key === expandedId}
                        compared={comparisonIds.includes(key)}
                        comparisonFull={!comparisonIds.includes(key) && comparisonIds.length >= 4}
                        watched={Boolean(player.nba_id && watchedIds.has(player.nba_id))}
                        watchPending={watchPending === player.nba_id}
                        hasFantasyAccess={hasFantasyAccess}
                        windowDays={payload.window.days}
                        colSpan={7 + categoryColumns.length}
                        onToggleExpand={() => setExpandedId((current) => current === key ? "" : key)}
                        onCompare={() => toggleComparison(player)}
                        onWatch={() => watchPlayer(player)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            {ordered.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">No players match these filters.</div>
            )}
            {remainingPlayers > 0 && (
              <div className="border-t border-slate-200 p-3 text-center dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((current) => current + PAGE_SIZE)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  Show {Math.min(PAGE_SIZE, remainingPlayers)} more · {remainingPlayers} remaining
                </button>
              </div>
            )}
          </section>

          {comparisonPlayers.length > 0 && (
            <ComparisonTray
              players={comparisonPlayers}
              href={comparisonHref}
              onRemove={(player) => toggleComparison(player)}
            />
          )}
        </>
      )}
    </div>
  );
}


function BrowseToolbar({
  query, onQueryChange, team, onTeamChange, position, onPositionChange, status, onStatusChange,
  availability, onAvailabilityChange, statsView, onStatsViewChange, freeAgentScope, onFreeAgentScopeChange,
  teams, positions, windowDays, hasWindowGames, faCounts, onRefresh, refreshing,
}: {
  query: string; onQueryChange: (value: string) => void;
  team: string; onTeamChange: (value: string) => void;
  position: string; onPositionChange: (value: string) => void;
  status: string; onStatusChange: (value: string) => void;
  availability: Availability; onAvailabilityChange: (value: Availability) => void;
  statsView: StatsView; onStatsViewChange: (value: StatsView) => void;
  freeAgentScope: FreeAgentScope; onFreeAgentScopeChange: (value: FreeAgentScope) => void;
  teams: ExplorerPayload["teams"]; positions: string[];
  windowDays: number; hasWindowGames: boolean; faCounts: ExplorerPayload["counts"];
  onRefresh: () => void; refreshing: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search player, NBA team or fantasy team…"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-950" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:shrink-0">
            <FilterSelect label="Fantasy team" value={team} onChange={onTeamChange} disabled={availability === "free_agent"}>
              <option value="all">All teams</option>
              {teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </FilterSelect>
            <FilterSelect label="Position" value={position} onChange={onPositionChange}>
              <option value="all">All positions</option>
              {positions.map((item) => <option key={item} value={item}>{item}</option>)}
            </FilterSelect>
            <FilterSelect label="Roster status" value={status} onChange={onStatusChange}>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Reserve">Reserve</option>
              <option value="IR">Injured reserve</option>
              <option value="injured">Any injury alert</option>
            </FilterSelect>
            <button type="button" disabled={refreshing} onClick={onRefresh}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200">
              Refresh
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(["all", "free_agent", "rostered"] as const).map((value) => (
              <StatsButton key={value} active={availability === value} onClick={() => onAvailabilityChange(value)}>
                {value === "all" ? "All" : value === "free_agent" ? "FA" : "Rostered"}
              </StatsButton>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <StatsButton active={statsView === "season"} onClick={() => onStatsViewChange("season")}>Season</StatsButton>
            <StatsButton active={statsView === "window"} disabled={!hasWindowGames} onClick={() => onStatsViewChange("window")}>Last {windowDays}d</StatsButton>
          </div>
          {!hasWindowGames && <p className="text-[11px] text-slate-500">No recent window games — season averages shown.</p>}
        </div>
        {availability === "free_agent" && (
          <details className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 dark:border-emerald-950 dark:bg-emerald-950/20">
            <summary className="cursor-pointer text-xs font-bold text-emerald-800 dark:text-emerald-300">NBA evidence filters</summary>
            <div className="mt-2 flex flex-wrap gap-1">
              <StatsButton active={freeAgentScope === "ranked"} onClick={() => onFreeAgentScopeChange("ranked")}>Ranked · {faCounts.free_agents_ranked}</StatsButton>
              <StatsButton active={freeAgentScope === "current_or_recent"} onClick={() => onFreeAgentScopeChange("current_or_recent")}>Current/recent · {faCounts.free_agents_current_or_recent}</StatsButton>
              <StatsButton active={freeAgentScope === "all_known"} onClick={() => onFreeAgentScopeChange("all_known")}>All known · {faCounts.free_agents}</StatsButton>
            </div>
            <p className="mt-2 text-[11px] text-emerald-800/80 dark:text-emerald-300/80">Legacy-only means no current team, salary or recent performance evidence; it does not prove inactivity.</p>
          </details>
        )}
      </div>
    </section>
  );
}

function BrowseDesktopRows(props: {
  player: FantasyPlayerPerformance; league: LeagueSlug; stats: FantasyPlayerStats | null; statsView: StatsView;
  categories: FantasyCategory[]; expanded: boolean; compared: boolean; comparisonFull: boolean;
  watched: boolean; watchPending: boolean; hasFantasyAccess: boolean; windowDays: number; colSpan: number;
  onToggleExpand: () => void; onCompare: () => void; onWatch: () => void;
}) {
  const { player, league, stats, statsView, categories, expanded, compared, comparisonFull, watched, watchPending, hasFantasyAccess, windowDays, colSpan, onToggleExpand, onCompare, onWatch } = props;
  return (
    <>
      <tr onClick={onToggleExpand} className={`cursor-pointer transition-colors ${expanded ? "bg-slate-50 dark:bg-slate-800/50" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"}`}>
        <td className="px-2 py-2.5 text-center font-bold tabular-nums text-slate-400">
          <span>{player.impact_rank ?? "—"}</span>
          {playerAvailability(player) === "free_agent" && player.availability_rank && player.availability_of && (
            <span className="mt-0.5 block text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">FA #{player.availability_rank}/{player.availability_of}</span>
          )}
        </td>
        <td className={`sticky left-0 z-10 px-3 py-2 ${expanded ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-900"}`}>
          <PlayerIdentityCell name={player.name} photo={player.photo} nbaId={player.nba_id} position={player.position} nbaTeam={nbaTeamDisplay(player)} size="sm" injury={Boolean(player.injury)} />
        </td>
        <td className="px-3 py-2.5"><FantasyAvailability league={league} player={player} compact /></td>
        <td className="px-3 py-2.5 text-right font-bold tabular-nums text-blue-700 dark:text-blue-400">{player.salary_2026_27 ?? "$0"}</td>
        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-600 dark:text-slate-300">{stats?.games ?? 0}</td>
        {categories.map((category) => (
          <td key={category.key} className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">{stats?.games ? formatFantasyStat(stats, category) : "—"}</td>
        ))}
        <td className="px-2 py-2.5 text-center" onClick={(event) => event.stopPropagation()}>
          {player.nba_id && watched ? (
            <Link href="/players?view=watched" className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Watching</Link>
          ) : (
            <button type="button" onClick={onWatch} disabled={!player.nba_id || watchPending} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300">{watchPending ? "…" : "+ Watch"}</button>
          )}
        </td>
        <td className="px-2 py-2.5 text-center" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={onCompare} disabled={comparisonFull} className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${compared ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"}`}>{compared ? "On" : "Add"}</button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/90 dark:bg-slate-950/40">
          <td colSpan={colSpan} className="px-4 py-3">
            <PlayerExpandedDetail player={player} league={league} stats={stats} statsView={statsView} categories={categories} hasFantasyAccess={hasFantasyAccess} windowDays={windowDays} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExplorerMobileCard(props: {
  player: FantasyPlayerPerformance; league: LeagueSlug; statsView: StatsView; categories: FantasyCategory[];
  expanded: boolean; compared: boolean; comparisonFull: boolean; watched: boolean; watchPending: boolean;
  hasFantasyAccess: boolean; windowDays: number;
  onToggleExpand: () => void; onCompare: () => void; onWatch: () => void;
}) {
  const { player, league, statsView, categories, expanded, compared, comparisonFull, watched, watchPending, hasFantasyAccess, windowDays, onToggleExpand, onCompare, onWatch } = props;
  const stats = statsFor(player, statsView);
  const topCategories = categories.slice(0, 3);
  return (
    <article className={`rounded-xl border px-3 py-2.5 transition ${expanded ? "border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/40" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
      <button type="button" onClick={onToggleExpand} className="flex w-full items-start gap-3 text-left">
        <PlayerIdentityCell
          name={player.name} photo={player.photo} nbaId={player.nba_id} position={player.position}
          nbaTeam={player.nba_team_short || player.nba_team} size="sm" injury={Boolean(player.injury)}
          trailing={<span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-400">#{player.impact_rank ?? "—"}</span>}
        />
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <FantasyAvailability league={league} player={player} compact />
        {topCategories.map((category) => (
          <span key={category.key} className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">{category.label}</span>{" "}
            <span className="tabular-nums text-slate-900 dark:text-white">{stats?.games ? formatFantasyStat(stats, category) : "—"}</span>
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {watched ? (
          <Link href="/players?view=watched" className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Watching</Link>
        ) : (
          <button type="button" onClick={onWatch} disabled={!player.nba_id || watchPending} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300">{watchPending ? "Saving…" : "+ Watch"}</button>
        )}
        <button type="button" onClick={onToggleExpand} className="ml-auto text-[11px] font-bold text-blue-600 dark:text-blue-400">{expanded ? "Less" : "More"}</button>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <PlayerExpandedDetail player={player} league={league} stats={stats} statsView={statsView} categories={categories} hasFantasyAccess={hasFantasyAccess} windowDays={windowDays} />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onCompare} disabled={comparisonFull} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${compared ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"}`}>{compared ? "In compare" : "Compare"}</button>
            <p className="self-center text-[11px] font-semibold tabular-nums text-blue-700 dark:text-blue-400">{player.salary_2026_27 ?? "$0"} · 2026–27</p>
          </div>
        </div>
      )}
    </article>
  );
}

function PlayerExpandedDetail({
  player, league, stats, statsView, categories, hasFantasyAccess, windowDays,
}: {
  player: FantasyPlayerPerformance; league: LeagueSlug; stats: FantasyPlayerStats | null; statsView: StatsView;
  categories: FantasyCategory[]; hasFantasyAccess: boolean; windowDays: number;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
      <div>
        {player.injury && (
          <p className="mb-2 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            Feed injury: {player.injury.body_part ? `${player.injury.body_part} · ` : ""}{player.injury.detail}
          </p>
        )}
        {hasFantasyAccess && player.nba_id && <div className="mb-2"><ReviewedInjuryNotice league={league} nbaId={player.nba_id} /></div>}
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Contract timeline</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {SALARY_SEASONS.map((season, index) => {
            const salary = player.salaries?.[season] ?? null;
            return (
              <div key={season} className={`rounded-lg border px-2 py-1.5 ${index === 0 ? "border-blue-300 bg-blue-600 text-white dark:border-blue-600" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
                <p className={`text-[9px] font-bold ${index === 0 ? "text-blue-100" : "text-slate-500"}`}>{season}</p>
                <p className={`truncate text-xs font-black tabular-nums ${index === 0 ? "" : "text-slate-900 dark:text-white"}`}>{salary ?? "$0"}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{statsView === "season" ? "Season averages" : `Last ${windowDays} days`} · {stats?.games ?? 0} GP</p>
          {player.player_id && (
            <Link href={`/players/${player.player_id}?league=${league}&from=explorer`} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">Full profile →</Link>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
          {categories.map((category) => (
            <div key={category.key} className="rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-[9px] font-bold text-slate-400">{category.label}</p>
              <p className="text-xs font-black tabular-nums text-slate-900 dark:text-white">{stats?.games ? formatFantasyStat(stats, category) : "—"}</p>
            </div>
          ))}
        </div>
        {player.category_strengths.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {player.category_strengths.map((strength) => (
              <span key={strength} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{strength}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonTray({ players, href, onRemove }: { players: FantasyPlayerPerformance[]; href: string; onRemove: (player: FantasyPlayerPerformance) => void }) {
  return (
    <aside className="sticky bottom-4 z-30 mt-5 rounded-2xl border border-blue-300 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-blue-800 dark:bg-slate-900/95">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Comparison · {players.length}/4</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {players.map((player) => (
              <button key={playerKey(player)} type="button" onClick={() => onRemove(player)}
                className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-red-950">
                <PlayerPhoto player={player} /><span>{player.name}</span><span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {players.length < 2 && <p className="text-xs text-slate-500">Select at least two players.</p>}
          <Link href={href} aria-disabled={players.length < 2}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${players.length >= 2 ? "bg-blue-600 text-white hover:bg-blue-700" : "pointer-events-none bg-slate-200 text-slate-400 dark:bg-slate-800"}`}>
            Compare players →
          </Link>
        </div>
      </div>
    </aside>
  );
}

function nbaTeamDisplay(player: FantasyPlayerPerformance): string {
  return player.nba_status?.recommendation_eligible === false
    ? `${player.nba_status.club} · ${player.nba_status.state === "outside_nba_confirmed" ? "outside NBA" : "NBA status review"}`
    : player.nba_team || "NBA team unverified";
}

function PlayerPhoto({ player, large = false }: { player: FantasyPlayerPerformance; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = photoUrl(player.photo, player.nba_id);
  const size = large ? 72 : 40;
  if (!photo || failed) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-black text-slate-500 dark:bg-slate-700 dark:text-slate-300" style={{ width: size, height: size, fontSize: large ? 24 : 14 }}>
        {player.name.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt="" width={size} height={size} onError={() => setFailed(true)} className="shrink-0 rounded-full bg-slate-100 object-cover dark:bg-slate-800" style={{ width: size, height: size }} />
  );
}

function FilterSelect({ label, value, onChange, disabled = false, children }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
        {children}
      </select>
    </label>
  );
}

function StatsButton({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${active ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-white"}`}>
      {children}
    </button>
  );
}

function FreeAgentBadge() {
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Free agent</span>;
}

function FantasyAvailability({ league, player, compact = false }: { league: LeagueSlug; player: FantasyPlayerPerformance; compact?: boolean }) {
  if (playerAvailability(player) === "free_agent") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <FreeAgentBadge />
        {player.nba_relevance === "legacy_only" && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">Legacy evidence only</span>
        )}
        {!compact && player.availability_rank && player.availability_of && (
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Market #{player.availability_rank} of {player.availability_of}</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <TeamLogo league={league} name={player.fantasy_team?.name ?? "Rostered"} logo={player.fantasy_team?.logo ?? null} size={compact ? 26 : 28} />
      <span className="max-w-36 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{player.fantasy_team?.name ?? "Rostered"}</span>
    </div>
  );
}

function SortableHeader({ label, sort, active, direction, onSort, className = "" }: { label: string; sort: SortKey; active: SortKey; direction: Direction; onSort: (key: SortKey) => void; className?: string }) {
  return (
    <th className={`px-3 py-2.5 ${className}`}>
      <button type="button" onClick={() => onSort(sort)} className="inline-flex items-center gap-1 font-bold hover:text-blue-600">
        {label}
        {active === sort && <span aria-hidden="true">{direction === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function ExplorerLoading() {
  return (
    <div className="mt-4 space-y-3">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      <div className="h-80 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

function statsFor(player: FantasyPlayerPerformance, view: StatsView): FantasyPlayerStats | null {
  return view === "season" ? player.season_average : player.window_stats;
}

function playerKey(player?: FantasyPlayerPerformance) {
  if (!player) return "";
  return `${player.fantasy_team?.id ?? "free_agent"}:${player.nba_id ?? player.name}`;
}

function playerAvailability(player: FantasyPlayerPerformance): "free_agent" | "rostered" {
  return player.availability ?? (player.fantasy_team ? "rostered" : "free_agent");
}

function statusMatches(player: FantasyPlayerPerformance, status: string) {
  if (status === "all") return true;
  if (status === "injured") return Boolean(player.injury);
  return player.status === status;
}

function comparePlayers(a: FantasyPlayerPerformance, b: FantasyPlayerPerformance, key: SortKey, direction: Direction, view: StatsView) {
  let result = 0;
  if (key === "rank") result = (a.impact_rank ?? Number.MAX_SAFE_INTEGER) - (b.impact_rank ?? Number.MAX_SAFE_INTEGER);
  else if (key === "name") result = a.name.localeCompare(b.name);
  else if (key === "fantasy_team") result = (a.fantasy_team?.name ?? "").localeCompare(b.fantasy_team?.name ?? "");
  else if (key === "salary") result = salaryValue(a.salary_2026_27) - salaryValue(b.salary_2026_27);
  else {
    result = (
      statValue(fantasyStatValue(statsFor(a, view), { key, label: key }))
      - statValue(fantasyStatValue(statsFor(b, view), { key, label: key }))
    );
  }
  return direction === "asc" ? result : -result;
}

function salaryValue(value: string | null) {
  return value ? Number(value.replace(/[$,]/g, "")) || 0 : 0;
}

function statValue(value: number | null | undefined) {
  return typeof value === "number" ? value : Number.NEGATIVE_INFINITY;
}

function buildComparisonHref(league: LeagueSlug, ids: string[]) {
  const params = new URLSearchParams({ league });
  ids.forEach((id) => params.append("player", id));
  return `/players/compare?${params.toString()}`;
}
