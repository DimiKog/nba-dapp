"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchPlayers, Player } from "@/lib/api";
import PlayerCard from "@/components/PlayerCard";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"salary" | "name" | "team">("salary");

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

  const orderedPlayers = [...players].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "team") return (a.team ?? "ZZZ").localeCompare(b.team ?? "ZZZ");
    return salaryValue(b.salary_current) - salaryValue(a.salary_current);
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Player Explorer</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Search players and compare their current contracts.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search by player name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="salary">2026–27 salary</option>
            <option value="name">Player name</option>
            <option value="team">NBA team</option>
          </select>
        </label>
      </div>

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
              {orderedPlayers.map((p) => (
                <PlayerCard key={p.id} player={p} />
              ))}
          </div>
        )}
      </div>
    </main>
  );
}

function salaryValue(value: string | null) {
  if (!value) return 0;
  return Number(value.replace(/[$,]/g, "")) || 0;
}
