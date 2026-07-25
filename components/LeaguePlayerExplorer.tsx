"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchFantasyWatchlist,
  fetchLeaguePlayerExplorer,
  photoUrl,
  type FantasyPlayerPerformance,
  type FantasyPlayerStats,
  type LeaguePlayerExplorer as ExplorerPayload,
} from "@/lib/api";
import TeamLogo from "@/components/TeamLogo";
import {
  fantasyStatValue,
  formatFantasyStat,
  resolveFantasyCategories,
  type FantasyCategory,
  type FantasyCategoryKey,
} from "@/lib/fantasyCategories";

type LeagueSlug = "ldl" | "bdb";
type StatsView = "season" | "window";
type Direction = "asc" | "desc";
type SortKey = "rank" | "name" | "fantasy_team" | "salary" | FantasyCategoryKey;

const SALARY_SEASONS = ["2026-27", "2027-28", "2028-29", "2029-30", "2030-31"] as const;

export default function LeaguePlayerExplorer() {
  const [league, setLeague] = useState<LeagueSlug>("ldl");
  const [payload, setPayload] = useState<ExplorerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("all");
  const [position, setPosition] = useState("all");
  const [status, setStatus] = useState("all");
  const [statsView, setStatsView] = useState<StatsView>("season");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [direction, setDirection] = useState<Direction>("asc");
  const [selectedId, setSelectedId] = useState("");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [watchPending, setWatchPending] = useState<number | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchLeaguePlayerExplorer(league),
      fetchFantasyWatchlist(league).catch(() => null),
    ])
      .then(([data, watchlist]) => {
        if (!active) return;
        setPayload(data);
        setWatchedIds(new Set(
          watchlist?.entries.map((entry) => entry.nba_player_id) ?? [],
        ));
        setStatsView(data.ranking_basis);
        const first = [...data.players].sort(rankPlayers)[0];
        setSelectedId(playerKey(first));
      })
      .catch(() => {
        if (active) setError(`Could not load ${league === "ldl" ? "LDL" : "BδB"} players.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [league]);

  function changeLeague(next: LeagueSlug) {
    if (next === league) return;
    setLoading(true);
    setError(null);
    setPayload(null);
    setTeam("all");
    setPosition("all");
    setStatus("all");
    setSelectedId("");
    setComparisonIds([]);
    setWatchedIds(new Set());
    setWatchError(null);
    setLeague(next);
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
        player.fantasy_team?.name,
        player.position,
      ].join(" ").toLowerCase();
      return (!normalized || searchable.includes(normalized))
        && (team === "all" || player.fantasy_team?.id === team)
        && (position === "all" || player.position.split(",").map((item) => item.trim()).includes(position))
        && statusMatches(player, status);
    });
  }, [payload, position, query, status, team]);

  const ordered = useMemo(() => {
    return [...filtered].sort((a, b) => comparePlayers(a, b, sortKey, direction, statsView));
  }, [direction, filtered, sortKey, statsView]);
  const categoryColumns = useMemo(
    () => resolveFantasyCategories(payload?.categories ?? []),
    [payload],
  );

  const selected = ordered.find((player) => playerKey(player) === selectedId)
    ?? ordered[0]
    ?? null;
  const injuredCount = filtered.filter((player) => player.injury).length;
  const freeAgentCount = filtered.filter((player) => !player.salary_2026_27).length;
  const hasWindowGames = payload?.players.some((player) => player.window_stats.games > 0) ?? false;

  function changeSort(next: SortKey) {
    if (next === sortKey) {
      setDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(next);
    setDirection(next === "rank" || next === "name" || next === "fantasy_team" || next === "turnovers" ? "asc" : "desc");
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
      const response = await fetch(`/api/watchlist/${league}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nba_player_id: player.nba_id,
          notes: "",
          priority: 2,
        }),
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

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1500px] px-4 py-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Fantasy intelligence</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Player Explorer</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Rank every rostered player by category, performance and contract.
          </p>
        </div>
        <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(["ldl", "bdb"] as const).map((item) => (
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
              {item === "ldl" ? "LDL" : "BδB"}
            </button>
          ))}
        </div>
      </div>

      {loading && <ExplorerLoading />}
      {error && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      {watchError && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {watchError}
        </div>
      )}

      {!loading && payload && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Visible players" value={filtered.length.toString()} detail={`${payload.players.length} roster slots`} />
            <SummaryCard label="Injury alerts" value={injuredCount.toString()} detail="In current result" tone={injuredCount ? "red" : undefined} />
            <SummaryCard label="Free agents" value={freeAgentCount.toString()} detail="No 2026–27 salary" />
            <SummaryCard
              label="Ranking basis"
              value={payload.ranking_basis === "season" ? "Season" : `${payload.window.days} days`}
              detail={`${payload.window.season} · cached ${formatTimestamp(payload.snapshot.captured_at)}`}
            />
          </div>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(145px,auto))]">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search player, NBA team or fantasy team…"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-950"
              />
              <FilterSelect label="Fantasy team" value={team} onChange={setTeam}>
                <option value="all">All teams</option>
                {payload.teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Position" value={position} onChange={setPosition}>
                <option value="all">All positions</option>
                {positions.map((item) => <option key={item} value={item}>{item}</option>)}
              </FilterSelect>
              <FilterSelect label="Roster" value={status} onChange={setStatus}>
                <option value="all">All statuses</option>
                <option value="Active">Active</option>
                <option value="Reserve">Reserve</option>
                <option value="IR">Injured reserve</option>
                <option value="injured">Any injury alert</option>
              </FilterSelect>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <StatsButton active={statsView === "season"} onClick={() => setStatsView("season")}>
                  Season averages
                </StatsButton>
                <StatsButton active={statsView === "window"} disabled={!hasWindowGames} onClick={() => setStatsView("window")}>
                  Last {payload.window.days} days
                </StatsButton>
              </div>
              {!hasWindowGames && (
                <p className="text-xs text-slate-500">No games in the recent window; season averages are shown.</p>
              )}
            </div>
          </section>

          {selected && (
            <PlayerDecisionPanel
              player={selected}
              league={league}
              statsView={statsView}
              categories={categoryColumns}
              onClose={() => setSelectedId("")}
            />
          )}

          <section className="mt-5 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">{payload.league.name} player rankings</h2>
                <p className="text-xs text-slate-500">Select a row for contract and injury details.</p>
              </div>
              <p className="text-xs font-semibold text-slate-500">{ordered.length} results</p>
            </div>
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-[1390px] w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                  <tr>
                    <SortableHeader label="#" sort="rank" active={sortKey} direction={direction} onSort={changeSort} className="w-14 text-center" />
                    <th className="w-20 px-3 py-3 text-center">Compare</th>
                    <th className="w-20 px-3 py-3 text-center">Watch</th>
                    <SortableHeader label="Player" sort="name" active={sortKey} direction={direction} onSort={changeSort} className="sticky left-0 z-20 min-w-60 bg-slate-50 text-left dark:bg-slate-800" />
                    <SortableHeader label="Fantasy team" sort="fantasy_team" active={sortKey} direction={direction} onSort={changeSort} className="min-w-44 text-left" />
                    <th className="px-3 py-3 text-left">Pos</th>
                    <SortableHeader label="2026–27" sort="salary" active={sortKey} direction={direction} onSort={changeSort} className="min-w-28 text-right" />
                    {categoryColumns.map((category) => (
                      <SortableHeader
                        key={category.key}
                        label={category.label}
                        sort={category.key}
                        active={sortKey}
                        direction={direction}
                        onSort={changeSort}
                        className="min-w-16 text-right"
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ordered.map((player) => {
                    const stats = statsFor(player, statsView);
                    const active = playerKey(player) === playerKey(selected);
                    return (
                      <tr
                        key={`${player.fantasy_team?.id}-${playerKey(player)}`}
                        onClick={() => setSelectedId(playerKey(player))}
                        className={`cursor-pointer transition-colors ${
                          active
                            ? "bg-blue-50 dark:bg-blue-950/30"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <td className="px-3 py-3 text-center font-bold tabular-nums text-slate-400">{player.impact_rank ?? "—"}</td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleComparison(player);
                            }}
                            disabled={!comparisonIds.includes(playerKey(player)) && comparisonIds.length >= 4}
                            className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
                              comparisonIds.includes(playerKey(player))
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {comparisonIds.includes(playerKey(player)) ? "Selected" : "Add"}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {player.nba_id && watchedIds.has(player.nba_id) ? (
                            <Link
                              href="/watchlist"
                              onClick={(event) => event.stopPropagation()}
                              className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            >
                              Watching
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                watchPlayer(player);
                              }}
                              disabled={!player.nba_id || watchPending === player.nba_id}
                              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {watchPending === player.nba_id ? "Saving…" : "+ Watch"}
                            </button>
                          )}
                        </td>
                        <td className={`sticky left-0 z-10 px-3 py-2.5 ${active ? "bg-blue-50 dark:bg-slate-900" : "bg-white dark:bg-slate-900"}`}>
                          <PlayerIdentity player={player} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <TeamLogo league={league} name={player.fantasy_team?.name ?? "Unknown"} logo={player.fantasy_team?.logo ?? null} size={26} />
                            <span className="max-w-36 truncate font-medium text-slate-700 dark:text-slate-300">{player.fantasy_team?.name ?? "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-500">{player.position || "—"}</td>
                        <td className="px-3 py-3 text-right font-bold tabular-nums text-blue-700 dark:text-blue-400">
                          {player.salary_2026_27 ?? "$0"}
                        </td>
                        {categoryColumns.map((category) => (
                          <td key={category.key} className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                            {formatFantasyStat(stats, category)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {ordered.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">No players match these filters.</div>
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
    </main>
  );
}

function PlayerDecisionPanel({
  player,
  league,
  statsView,
  categories,
  onClose,
}: {
  player: FantasyPlayerPerformance;
  league: LeagueSlug;
  statsView: StatsView;
  categories: FantasyCategory[];
  onClose: () => void;
}) {
  const stats = statsFor(player, statsView);
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm dark:border-blue-900 dark:from-blue-950/50 dark:via-slate-900 dark:to-indigo-950/30">
      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(260px,0.9fr)_minmax(420px,1.5fr)_minmax(300px,1fr)]">
        <div className="flex gap-4">
          <PlayerPhoto player={player} large />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-black text-slate-950 dark:text-white">{player.name}</p>
              {player.status !== "Active" && <StatusBadge status={player.status} />}
            </div>
            <p className="mt-1 text-sm text-slate-500">{player.nba_team || "NBA team unavailable"} · {player.position || "Position unavailable"}</p>
            <div className="mt-3 flex items-center gap-2">
              <TeamLogo league={league} name={player.fantasy_team?.name ?? "Unknown"} logo={player.fantasy_team?.logo ?? null} size={28} />
              <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{player.fantasy_team?.name}</span>
            </div>
            {player.injury && (
              <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {player.injury.body_part ? `${player.injury.body_part} · ` : ""}{player.injury.detail}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {player.category_strengths.map((strength) => (
                <span key={strength} className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{strength}</span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Contract timeline</p>
            <p className="text-[11px] text-slate-400">Missing salary = $0 free agent</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {SALARY_SEASONS.map((season, index) => {
              const salary = player.salaries?.[season] ?? null;
              return (
              <div
                key={season}
                className={`rounded-xl border p-3 ${
                  index === 0
                    ? "col-span-2 border-blue-300 bg-blue-600 text-white sm:col-span-1 sm:scale-[1.04] dark:border-blue-600"
                    : "border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70"
                }`}
              >
                <p className={`text-[10px] font-bold ${index === 0 ? "text-blue-100" : "text-slate-500"}`}>{season}</p>
                <p className={`mt-1 truncate font-black tabular-nums ${index === 0 ? "text-lg" : "text-sm text-slate-900 dark:text-white"}`}>{salary ?? "$0"}</p>
                {!salary && <p className={`text-[10px] ${index === 0 ? "text-blue-100" : "text-slate-400"}`}>Free agent</p>}
              </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {statsView === "season" ? "Season averages" : "Recent totals"}
            </p>
            {player.player_id && (
              <Link href={`/players/${player.player_id}`} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Full profile →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((category) => (
                <div key={category.key} className="rounded-lg border border-slate-200 bg-white/80 p-2 text-center dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[10px] font-bold text-slate-400">{category.label}</p>
                  <p className="mt-0.5 font-black tabular-nums text-slate-900 dark:text-white">{formatFantasyStat(stats, category)}</p>
                </div>
            ))}
          </div>
        </div>
      </div>
      <button type="button" onClick={onClose} className="sr-only">Close player details</button>
    </section>
  );
}

function ComparisonTray({
  players,
  href,
  onRemove,
}: {
  players: FantasyPlayerPerformance[];
  href: string;
  onRemove: (player: FantasyPlayerPerformance) => void;
}) {
  return (
    <aside className="sticky bottom-4 z-30 mt-5 rounded-2xl border border-blue-300 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-blue-800 dark:bg-slate-900/95">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Comparison · {players.length}/4
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {players.map((player) => (
              <button
                key={playerKey(player)}
                type="button"
                onClick={() => onRemove(player)}
                className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-red-950"
              >
                <PlayerPhoto player={player} />
                <span>{player.name}</span>
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {players.length < 2 && (
            <p className="text-xs text-slate-500">Select at least two players.</p>
          )}
          <Link
            href={href}
            aria-disabled={players.length < 2}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              players.length >= 2
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "pointer-events-none bg-slate-200 text-slate-400 dark:bg-slate-800"
            }`}
          >
            Compare players →
          </Link>
        </div>
      </div>
    </aside>
  );
}

function PlayerIdentity({ player }: { player: FantasyPlayerPerformance }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PlayerPhoto player={player} />
      <div className="min-w-0">
        <p className="truncate font-bold text-slate-950 dark:text-white">{player.name}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span>{player.nba_team || "NBA team unavailable"}</span>
          {player.injury && <span className="font-bold text-red-500">● Injury</span>}
        </div>
      </div>
    </div>
  );
}

function PlayerPhoto({ player, large = false }: { player: FantasyPlayerPerformance; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = photoUrl(player.photo, player.nba_id);
  const size = large ? 72 : 40;
  if (!photo || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-black text-slate-500 dark:bg-slate-700 dark:text-slate-300"
        style={{ width: size, height: size, fontSize: large ? 24 : 14 }}
      >
        {player.name.charAt(0)}
      </span>
    );
  }
  return (
    // Photos may be local backend assets or external source URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-slate-100 object-cover dark:bg-slate-800"
      style={{ width: size, height: size }}
    />
  );
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "red" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${tone === "red" ? "text-red-600 dark:text-red-400" : "text-slate-950 dark:text-white"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        {children}
      </select>
    </label>
  );
}

function StatsButton({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
          : "text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-950 dark:text-amber-300">{status}</span>;
}

function SortableHeader({
  label,
  sort,
  active,
  direction,
  onSort,
  className = "",
}: {
  label: string;
  sort: SortKey;
  active: SortKey;
  direction: Direction;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <th className={`px-3 py-3 ${className}`}>
      <button type="button" onClick={() => onSort(sort)} className="inline-flex items-center gap-1 font-bold hover:text-blue-600">
        {label}
        {active === sort && <span aria-hidden="true">{direction === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function ExplorerLoading() {
  return (
    <div className="mt-8 space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

function statsFor(player: FantasyPlayerPerformance, view: StatsView): FantasyPlayerStats | null {
  return view === "season" ? player.season_average : player.window_stats;
}

function playerKey(player?: FantasyPlayerPerformance) {
  if (!player) return "";
  return `${player.fantasy_team?.id ?? "unknown"}:${player.nba_id ?? player.name}`;
}

function rankPlayers(a: FantasyPlayerPerformance, b: FantasyPlayerPerformance) {
  return (a.impact_rank ?? Number.MAX_SAFE_INTEGER) - (b.impact_rank ?? Number.MAX_SAFE_INTEGER);
}

function statusMatches(player: FantasyPlayerPerformance, status: string) {
  if (status === "all") return true;
  if (status === "injured") return Boolean(player.injury);
  return player.status === status;
}

function comparePlayers(
  a: FantasyPlayerPerformance,
  b: FantasyPlayerPerformance,
  key: SortKey,
  direction: Direction,
  view: StatsView,
) {
  let result = 0;
  if (key === "rank") {
    result = (a.impact_rank ?? Number.MAX_SAFE_INTEGER) - (b.impact_rank ?? Number.MAX_SAFE_INTEGER);
  } else if (key === "name") {
    result = a.name.localeCompare(b.name);
  } else if (key === "fantasy_team") {
    result = (a.fantasy_team?.name ?? "").localeCompare(b.fantasy_team?.name ?? "");
  } else if (key === "salary") {
    result = salaryValue(a.salary_2026_27) - salaryValue(b.salary_2026_27);
  } else {
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

function formatTimestamp(value: string | null) {
  if (!value) return "unknown";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildComparisonHref(league: LeagueSlug, ids: string[]) {
  const params = new URLSearchParams({ league });
  ids.forEach((id) => params.append("player", id));
  return `/players/compare?${params.toString()}`;
}
