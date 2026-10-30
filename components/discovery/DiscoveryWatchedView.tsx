"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PlayerIdentityCell from "@/components/discovery/PlayerIdentityCell";
import type { FantasyWatchlist, FantasyWatchlistEntry } from "@/lib/api";
import { fetchFantasyWatchlist } from "@/lib/api";
import {
  priorityLabel,
  removeWatchlistEntry,
  sortWatchlistEntries,
  upsertWatchlistEntry,
  type WatchlistPriority,
} from "@/lib/watchlistClient";
import { buildDiscoveryHref } from "@/lib/discoveryViews";
import type { DiscoveryLeagueSlug } from "@/lib/discoveryLeagues";

function availabilityLabel(entry: FantasyWatchlistEntry): string {
  const player = entry.player;
  if (!player) return "Unknown";
  if (player.availability === "free_agent") return "Available";
  return player.fantasy_team?.name ? `Owned · ${player.fantasy_team.name}` : "Rostered";
}

function AvailabilityBadge({ entry }: { entry: FantasyWatchlistEntry }) {
  const available = entry.player?.availability === "free_agent";
  const tone = available
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      {availabilityLabel(entry)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: WatchlistPriority }) {
  const tone = priority === 1
    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
    : priority === 3
      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      {priorityLabel(priority)}
    </span>
  );
}

function WatchedRow({
  entry,
  league,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSaved,
  onUnwatch,
}: {
  entry: FantasyWatchlistEntry;
  league: DiscoveryLeagueSlug;
  editingId: number | null;
  onStartEdit: (id: number) => void;
  onCancelEdit: () => void;
  onSaved: (entry: FantasyWatchlistEntry) => void;
  onUnwatch: (id: number) => void;
}) {
  const [draftNotes, setDraftNotes] = useState(entry.notes);
  const [draftPriority, setDraftPriority] = useState<WatchlistPriority>(entry.priority);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = editingId === entry.nba_player_id;
  const player = entry.player;
  const name = player?.name ?? `NBA player #${entry.nba_player_id}`;
  const intelligenceHref = player?.player_id
    ? `/players/${player.player_id}?league=${league}&from=watchlist`
    : null;

  function beginEdit() {
    setDraftNotes(entry.notes);
    setDraftPriority(entry.priority);
    setError(null);
    onStartEdit(entry.nba_player_id);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await upsertWatchlistEntry(league, {
        nbaPlayerId: entry.nba_player_id,
        notes: draftNotes,
        priority: draftPriority,
      });
      if (!res.ok) throw new Error("Could not update watchlist entry");
      onSaved({
        ...entry,
        notes: draftNotes.trim(),
        priority: draftPriority,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function unwatch() {
    setBusy(true);
    setError(null);
    try {
      const res = await removeWatchlistEntry(league, entry.nba_player_id);
      if (!res.ok) throw new Error("Could not remove from watchlist");
      onUnwatch(entry.nba_player_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove");
      setBusy(false);
    }
  }

  return (
    <article
      data-testid="watched-row"
      className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <PlayerIdentityCell
            name={name}
            photo={player?.photo}
            nbaId={entry.nba_player_id}
            position={player?.position}
            nbaTeam={player?.nba_team}
            injury={Boolean(player?.injury)}
            size="md"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AvailabilityBadge entry={entry} />
            <PriorityBadge priority={entry.priority} />
          </div>
          {!editing && entry.notes ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300" data-testid="watched-note">
              {entry.notes}
            </p>
          ) : null}
          {!editing && !entry.notes ? (
            <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">No note</p>
          ) : null}
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
          {!editing ? (
            <button
              type="button"
              onClick={beginEdit}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Edit
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void unwatch()}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
            data-testid="watched-unwatch"
          >
            Unwatch
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800" data-testid="watched-edit">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            Priority
            <select
              value={draftPriority}
              onChange={(e) => setDraftPriority(Number(e.target.value) as WatchlistPriority)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              data-testid="watched-priority"
            >
              <option value={1}>High</option>
              <option value={2}>Medium</option>
              <option value={3}>Low</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            Note
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              data-testid="watched-notes"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
              data-testid="watched-save"
            >
              Save
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancelEdit}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p> : null}
    </article>
  );
}

export default function DiscoveryWatchedView({
  league,
}: {
  league: DiscoveryLeagueSlug;
}) {
  const [payload, setPayload] = useState<FantasyWatchlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "1" | "2" | "3">("ALL");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    // Initial loading=true; parent remounts on league change so no sync setState here.
    void (async () => {
      try {
        const data = await fetchFantasyWatchlist(league, 7);
        if (!active) return;
        setPayload({
          ...data,
          entries: sortWatchlistEntries(data.entries),
        });
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load watchlist");
        setPayload(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [league]);

  const positions = useMemo(() => {
    const set = new Set<string>();
    for (const entry of payload?.entries ?? []) {
      const pos = entry.player?.position;
      if (pos) {
        for (const part of pos.split(",")) {
          const trimmed = part.trim();
          if (trimmed) set.add(trimmed);
        }
      }
    }
    return Array.from(set).sort();
  }, [payload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (payload?.entries ?? []).filter((entry) => {
      if (priorityFilter !== "ALL" && String(entry.priority) !== priorityFilter) return false;
      if (position !== "ALL") {
        const parts = (entry.player?.position ?? "").split(",").map((p) => p.trim());
        if (!parts.includes(position)) return false;
      }
      if (!q) return true;
      const name = entry.player?.name?.toLowerCase() ?? "";
      const team = entry.player?.nba_team?.toLowerCase() ?? "";
      return name.includes(q) || team.includes(q) || entry.notes.toLowerCase().includes(q);
    });
  }, [payload, search, position, priorityFilter]);

  function handleSaved(next: FantasyWatchlistEntry) {
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: sortWatchlistEntries(
          prev.entries.map((entry) => (entry.nba_player_id === next.nba_player_id ? next : entry)),
        ),
      };
    });
    setEditingId(null);
  }

  function handleUnwatch(nbaPlayerId: number) {
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.filter((entry) => entry.nba_player_id !== nbaPlayerId),
      };
    });
    setEditingId(null);
  }

  if (loading && !payload) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Loading watched players…
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
        {error}
      </div>
    );
  }

  const total = payload?.entries.length ?? 0;

  return (
    <section data-testid="discovery-watched" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search watched…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 sm:max-w-xs"
          data-testid="watched-search"
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
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "ALL" | "1" | "2" | "3")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          aria-label="Filter by priority"
          data-testid="watched-priority-filter"
        >
          <option value="ALL">All priorities</option>
          <option value="1">High</option>
          <option value="2">Medium</option>
          <option value="3">Low</option>
        </select>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400" data-testid="watched-status">
        {total === 0
          ? "No watched players yet"
          : `Showing ${filtered.length} of ${total} watched · ordered by priority`}
      </p>

      {total === 0 ? (
        <div
          className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50"
          data-testid="watched-empty"
        >
          <p className="text-base font-bold text-slate-900 dark:text-white">No watched players yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Browse the player pool and watch anyone you want to monitor.
          </p>
          <Link
            href={buildDiscoveryHref({ league, view: "browse" })}
            className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
            data-testid="watched-browse-cta"
          >
            Go to Browse
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No watched players match these filters.
        </div>
      ) : (
        <div className="space-y-2" data-testid="watched-list">
          {filtered.map((entry) => (
            <WatchedRow
              key={entry.id}
              entry={entry}
              league={league}
              editingId={editingId}
              onStartEdit={setEditingId}
              onCancelEdit={() => setEditingId(null)}
              onSaved={handleSaved}
              onUnwatch={handleUnwatch}
            />
          ))}
        </div>
      )}
    </section>
  );
}
