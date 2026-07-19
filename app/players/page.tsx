"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchPlayers, Player } from "@/lib/api";
import PlayerCard from "@/components/PlayerCard";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlayers(q.length >= 2 ? q : undefined);
      setPlayers(data);
    } catch {
      setError("Could not load players.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(query), 300);
    return () => clearTimeout(timer);
  }, [query, load]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Players</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{players.length} players</p>

      <input
        type="text"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-4 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      <div className="mt-6">
        {loading && (
          <p className="text-sm text-slate-400">Loading…</p>
        )}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        {!loading && !error && players.length === 0 && (
          <p className="text-sm text-slate-400">No players found.</p>
        )}
        {!loading && !error && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
