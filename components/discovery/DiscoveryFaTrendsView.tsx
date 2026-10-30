"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PlayerIdentityCell from "@/components/discovery/PlayerIdentityCell";
import {
  MinutesTrendEvidence,
  RadarScoreExplanation,
  SeasonContextChips,
  TrendChips,
} from "@/components/discovery/TrendEvidence";
import type { FantasyFreeAgentRadar, FantasyRadarPlayer } from "@/lib/api";
import { upsertWatchlistEntry, removeWatchlistEntry } from "@/lib/watchlistClient";
import type { DiscoveryLeagueSlug } from "@/lib/discoveryLeagues";

const PAGE_SIZE = 25;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: FantasyFreeAgentRadar }
  | { kind: "fa_not_ready"; message: string }
  | { kind: "error"; message: string };

async function loadRadar(
  league: DiscoveryLeagueSlug,
  minimumGames: number,
): Promise<LoadState> {
  const res = await fetch(
    `${API_BASE}/api/fantasy/${league}/free-agent-radar?window=7&min_games=${minimumGames}`,
    { cache: "no-store" },
  );
  if (res.status === 503) {
    return {
      kind: "fa_not_ready",
      message: "Free-agent market data is not ready for this league yet.",
    };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = typeof body === "object" && body && "error" in body
      ? String((body as { error: unknown }).error)
      : "Failed to load FA trends";
    return { kind: "error", message };
  }
  const data = await res.json() as FantasyFreeAgentRadar;
  return { kind: "ready", data };
}

function TrendRow({
  player,
  league,
  categories,
  watched,
  onWatchChange,
}: {
  player: FantasyRadarPlayer;
  league: DiscoveryLeagueSlug;
  categories: string[];
  watched: boolean;
  onWatchChange: (nbaId: number, next: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const score = player.trend_score ?? 0;
  const rising = score >= 0;
  const directionTone = rising
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  const intelligenceHref = player.player_id
    ? `/players/${player.player_id}?league=${league}&from=fa-trends`
    : null;

  async function toggleWatch() {
    if (player.nba_id == null) return;
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
      data-testid="fa-trend-row"
      className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <span className="mt-1 inline-flex min-w-7 justify-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              #{player.trend_rank ?? "—"}
            </span>
            <div className="min-w-0 flex-1">
              <PlayerIdentityCell
                name={player.name}
                photo={player.photo}
                nbaId={player.nba_id}
                position={player.position}
                nbaTeam={player.nba_team}
                injury={Boolean(player.injury)}
                size="md"
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Free agent
            </span>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${directionTone}`}>
              {rising ? "Rising" : "Cooling"}
            </span>
            {player.trend_confidence ? (
              <span className="text-[11px] font-medium capitalize text-slate-500 dark:text-slate-400">
                {player.trend_confidence.replaceAll("_", " ")} · {player.window_stats.games} recent games
              </span>
            ) : null}
          </div>
          <TrendChips trends={player.category_trends} />
          <MinutesTrendEvidence trend={player.minutes_trend} />
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-bold text-blue-700 dark:text-blue-300">
              Trend evidence
            </summary>
            <RadarScoreExplanation player={player} />
            <SeasonContextChips player={player} categories={categories} />
          </details>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {intelligenceHref ? (
            <Link
              href={intelligenceHref}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Open
            </Link>
          ) : null}
          <button
            type="button"
            disabled={busy || player.nba_id == null}
            onClick={() => void toggleWatch()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="fa-trend-watch"
          >
            {watched ? "Watching" : "Watch"}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p> : null}
    </article>
  );
}

export default function DiscoveryFaTrendsView({
  league,
}: {
  league: DiscoveryLeagueSlug;
}) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [minimumGames, setMinimumGames] = useState(2);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("ALL");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const radarFetchKey = `${league}|${minimumGames}`;
  const [activeRadarFetchKey, setActiveRadarFetchKey] = useState(radarFetchKey);

  // League remounts via parent key; min-games changes adjust loading UI during render
  // so the effect body never calls setState synchronously.
  if (radarFetchKey !== activeRadarFetchKey) {
    setActiveRadarFetchKey(radarFetchKey);
    setState({ kind: "loading" });
    setVisible(PAGE_SIZE);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await loadRadar(league, minimumGames);
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [radarFetchKey, league, minimumGames]);

  // Seed watch buttons once while FA Trends is active — not a dual 60s refresh loop.
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
        /* watch seed is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [league]);

  const players = state.kind === "ready" ? state.data.players : [];
  const categories = state.kind === "ready" ? state.data.categories : [];

  const positions = useMemo(() => {
    const set = new Set<string>();
    for (const player of players) {
      for (const part of player.position.split(",")) {
        const trimmed = part.trim();
        if (trimmed) set.add(trimmed);
      }
    }
    return Array.from(set).sort();
  }, [players]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Preserve backend trend_rank / trend_score order — filter only.
    return players.filter((player) => {
      if (position !== "ALL") {
        const parts = player.position.split(",").map((p) => p.trim());
        if (!parts.includes(position)) return false;
      }
      if (!q) return true;
      return (
        player.name.toLowerCase().includes(q)
        || player.nba_team.toLowerCase().includes(q)
      );
    });
  }, [players, search, position]);

  const page = filtered.slice(0, visible);

  if (state.kind === "loading") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Loading FA trends…
      </div>
    );
  }

  if (state.kind === "fa_not_ready") {
    return (
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center dark:border-amber-900 dark:bg-amber-950/30"
        data-testid="fa-trends-not-ready"
      >
        <p className="text-base font-bold text-amber-950 dark:text-amber-100">
          Free-agent market data is not ready for this league yet.
        </p>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
          FA Trends will appear here once availability data is available. No invented market data is shown.
        </p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
        {state.message}
      </div>
    );
  }

  return (
    <section data-testid="discovery-fa-trends" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search free agents…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 sm:max-w-xs"
          data-testid="fa-trends-search"
        />
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          aria-label="Filter by position"
        >
          <option value="ALL">All positions</option>
          {positions.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          Min games
          <select
            value={minimumGames}
            onChange={(e) => setMinimumGames(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            data-testid="fa-trends-min-games"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400" data-testid="fa-trends-status">
        Showing {page.length} of {filtered.length} trending free agents · ordered by trend rank
      </p>

      {/* Explicitly no Watchlist section above FA Trends — Watched is a sibling Discovery tab. */}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No free agents match these filters.
        </div>
      ) : (
        <div className="space-y-2" data-testid="fa-trends-list">
          {page.map((player) => (
            <TrendRow
              key={player.nba_id ?? player.name}
              player={player}
              league={league}
              categories={categories}
              watched={player.nba_id != null && watchedIds.has(player.nba_id)}
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

      {visible < filtered.length ? (
        <button
          type="button"
          onClick={() => setVisible((n) => n + PAGE_SIZE)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          data-testid="fa-trends-load-more"
        >
          Load more
        </button>
      ) : null}
    </section>
  );
}
