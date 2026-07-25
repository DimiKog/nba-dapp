"use client";

import { useMemo, useState } from "react";
import {
  fetchFantasyWatchlist,
  fetchFreeAgentRadar,
  photoUrl,
  type FantasyFreeAgentRadar,
  type FantasyRadarPlayer,
  type FantasyWatchlist,
  type FantasyWatchlistEntry,
} from "@/lib/api";
import {
  formatFantasyStat,
  resolveFantasyCategories,
} from "@/lib/fantasyCategories";

type LeagueSlug = "ldl" | "bdb";

export default function WatchlistRadar({
  initialRadar,
  initialWatchlist,
}: {
  initialRadar: FantasyFreeAgentRadar | null;
  initialWatchlist: FantasyWatchlist | null;
}) {
  const [league, setLeague] = useState<LeagueSlug>("ldl");
  const [radar, setRadar] = useState<FantasyFreeAgentRadar | null>(initialRadar);
  const [watchlist, setWatchlist] = useState<FantasyWatchlist | null>(initialWatchlist);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("all");
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(30);

  const watchedIds = useMemo(
    () => new Set(watchlist?.entries.map((entry) => entry.nba_player_id) ?? []),
    [watchlist],
  );
  const positions = useMemo(
    () => Array.from(new Set(
      (radar?.players ?? [])
        .flatMap((player) => player.position.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    )).sort(),
    [radar],
  );
  const visibleRadar = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (radar?.players ?? []).filter((player) => {
      const matchesQuery = !needle
        || player.name.toLowerCase().includes(needle)
        || player.nba_team.toLowerCase().includes(needle);
      const matchesPosition = position === "all"
        || player.position.split(",").map((item) => item.trim()).includes(position);
      return matchesQuery && matchesPosition;
    });
  }, [position, query, radar]);
  const eligible = visibleRadar.filter((player) => player.trend_rank != null);
  const categoryColumns = useMemo(
    () => resolveFantasyCategories(radar?.categories ?? []),
    [radar],
  );

  async function loadLeague(next: LeagueSlug) {
    if (next === league) return;
    setLeague(next);
    setLoading(true);
    setMessage(null);
    setQuery("");
    setPosition("all");
    setVisibleLimit(30);
    const [nextRadar, nextWatchlist] = await Promise.all([
      fetchFreeAgentRadar(next).catch(() => null),
      fetchFantasyWatchlist(next).catch(() => null),
    ]);
    setRadar(nextRadar);
    setWatchlist(nextWatchlist);
    setLoading(false);
  }

  async function refreshWatchlist() {
    const next = await fetchFantasyWatchlist(league);
    setWatchlist(next);
  }

  async function savePlayer(
    nbaPlayerId: number,
    notes = "",
    priority: 1 | 2 | 3 = 2,
  ) {
    setPendingId(nbaPlayerId);
    setMessage(null);
    try {
      const response = await fetch(`/api/watchlist/${league}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nba_player_id: nbaPlayerId,
          notes,
          priority,
        }),
      });
      if (!response.ok) throw new Error();
      await refreshWatchlist();
    } catch {
      setMessage("The watchlist change could not be saved.");
    } finally {
      setPendingId(null);
    }
  }

  async function removePlayer(nbaPlayerId: number) {
    setPendingId(nbaPlayerId);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/watchlist/${league}/${nbaPlayerId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
      await refreshWatchlist();
    } catch {
      setMessage("The player could not be removed.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
            Fantasy intelligence
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
            Watchlist & FA Radar
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Track trade targets and find available players trending upward in each league&apos;s categories.
          </p>
        </div>
        <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(["ldl", "bdb"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => loadLeague(item)}
              className={`rounded-lg px-6 py-2 text-sm font-bold ${
                league === item
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {item === "ldl" ? "LDL" : "BδB"}
            </button>
          ))}
        </div>
      </header>

      {message && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {message}
        </p>
      )}

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">My watchlist</h2>
            <p className="text-sm text-slate-500">Rostered trade targets and free agents in one place.</p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {watchlist?.entries.length ?? 0} players
          </span>
        </div>
        {loading ? (
          <LoadingPanel />
        ) : watchlist?.entries.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {watchlist.entries.map((entry) => (
              <WatchlistCard
                key={entry.id}
                entry={entry}
                pending={pendingId === entry.nba_player_id}
                onSave={savePlayer}
                onRemove={removePlayer}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="font-bold text-slate-800 dark:text-slate-200">No watched players yet</p>
            <p className="mt-1 text-sm text-slate-500">Use the radar below to add your first target.</p>
          </div>
        )}
      </section>

      <section className="mt-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Free-agent radar</h2>
            <p className="text-sm text-slate-500">
              Recent per-game change versus season average · {radar?.categories.length ?? 0} categories.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleLimit(30);
              }}
              placeholder="Search player or NBA team…"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900"
            />
            <select
              value={position}
              onChange={(event) => {
                setPosition(event.target.value);
                setVisibleLimit(30);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="all">All positions</option>
              {positions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingPanel />
        ) : !radar ? (
          <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            Radar data is temporarily unavailable.
          </p>
        ) : (
          <>
            {eligible.length === 0 && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="font-bold text-blue-950 dark:text-blue-100">No qualifying recent performances</p>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  No free agent played at least {radar.minimum_games} games in the last {radar.window.days} days. The complete pool remains available below using season context.
                </p>
              </div>
            )}
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {visibleRadar.slice(0, visibleLimit).map((player) => (
                <RadarCard
                  key={player.nba_id}
                  player={player}
                  categoryColumns={categoryColumns}
                  watched={player.nba_id != null && watchedIds.has(player.nba_id)}
                  pending={pendingId === player.nba_id}
                  onWatch={() => player.nba_id && savePlayer(player.nba_id)}
                />
              ))}
            </div>
            {visibleRadar.length === 0 && (
              <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-900">
                No free agents match these filters.
              </p>
            )}
            {visibleRadar.length > visibleLimit && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((current) => current + 30)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  Show 30 more · {visibleRadar.length - visibleLimit} remaining
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function WatchlistCard({
  entry,
  pending,
  onSave,
  onRemove,
}: {
  entry: FantasyWatchlistEntry;
  pending: boolean;
  onSave: (id: number, notes: string, priority: 1 | 2 | 3) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  const [notes, setNotes] = useState(entry.notes);
  const [priority, setPriority] = useState<1 | 2 | 3>(entry.priority);
  const player = entry.player;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <PlayerPhoto player={player} fallback="?" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-black text-slate-950 dark:text-white">
                {player?.name ?? `NBA player #${entry.nba_player_id}`}
              </h3>
              <p className="text-xs text-slate-500">
                {player
                  ? player.availability === "free_agent"
                    ? "Free agent"
                    : player.fantasy_team?.name ?? "Rostered"
                  : "Player details unavailable"}
                {player?.nba_team ? ` · ${player.nba_team}` : ""}
              </p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
              player?.availability === "free_agent"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            }`}>
              {player?.availability === "free_agent" ? "Available" : "Trade target"}
            </span>
          </div>
          {player && <TrendChips trends={player.category_trends} />}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes: fit, price, trade idea…"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
        <select
          value={priority}
          onChange={(event) => setPriority(Number(event.target.value) as 1 | 2 | 3)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          <option value={1}>High priority</option>
          <option value={2}>Medium priority</option>
          <option value={3}>Low priority</option>
        </select>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onRemove(entry.nba_player_id)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
        >
          Remove
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(entry.nba_player_id, notes, priority)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </article>
  );
}

function RadarCard({
  player,
  categoryColumns,
  watched,
  pending,
  onWatch,
}: {
  player: FantasyRadarPlayer;
  categoryColumns: ReturnType<typeof resolveFantasyCategories>;
  watched: boolean;
  pending: boolean;
  onWatch: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex gap-3">
        <PlayerPhoto player={player} fallback={player.name.slice(0, 1)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {player.trend_rank != null
                  ? `#${player.trend_rank} upward trend`
                  : "Available free agent · season reference"}
              </p>
              <h3 className="font-black text-slate-950 dark:text-white">{player.name}</h3>
              <p className="text-xs text-slate-500">{player.nba_team || "NBA team unavailable"} · {player.position || "—"}</p>
            </div>
            <button
              type="button"
              disabled={watched || pending || !player.nba_id}
              onClick={onWatch}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                watched
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              }`}
            >
              {watched ? "Watching" : pending ? "Saving…" : "+ Watch"}
            </button>
          </div>
          {player.trend_rank != null ? (
            <TrendChips trends={player.category_trends} />
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categoryColumns.slice(0, 5).map((category) => (
                <span
                  key={category.key}
                  className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {category.label} {formatFantasyStat(player.season_average, category)}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              {player.trend_rank != null
                ? `${player.recent_average.games} recent games`
                : `${player.season_average?.games ?? 0} season games`}
            </span>
            <span>{player.salary_2026_27 ?? "$0 · Free agent contract"}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {player.trend_rank != null
                ? `${player.trend_confidence} confidence`
                : "No recent sample"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function TrendChips({
  trends,
}: {
  trends: Record<string, { delta: number | null; improved: boolean | null }>;
}) {
  const improvements = Object.entries(trends)
    .filter(([, trend]) => trend.improved && trend.delta != null)
    .sort((a, b) => Math.abs(b[1].delta ?? 0) - Math.abs(a[1].delta ?? 0))
    .slice(0, 4);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {improvements.length ? improvements.map(([label, trend]) => (
        <span key={label} className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          {label} {trend.delta! > 0 ? "+" : ""}{trend.delta}
        </span>
      )) : (
        <span className="text-xs text-slate-400">No recent category improvement.</span>
      )}
    </div>
  );
}

function PlayerPhoto({
  player,
  fallback,
}: {
  player: { photo: string | null; nba_id: number | null } | null;
  fallback: string;
}) {
  const src = player ? photoUrl(player.photo, player.nba_id) : null;
  return src ? (
    <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-full bg-slate-100 object-cover dark:bg-slate-800" />
  ) : (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-400 dark:bg-slate-800">
      {fallback}
    </span>
  );
}

function LoadingPanel() {
  return <div className="mt-4 h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
}
