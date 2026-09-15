"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPlayerResearch,
  type PlayerResearchEvidence,
} from "@/lib/api";

type ResearchPlayer = {
  nba_id: number;
  name: string;
  nba_team?: string | null;
  position?: string | null;
};

export default function TradePlayerResearchPanel({
  league,
  players,
}: {
  league: "ldl" | "bdb";
  players: ResearchPlayer[];
}) {
  const uniquePlayers = useMemo(
    () => [...new Map(players.map((player) => [player.nba_id, player])).values()],
    [players],
  );
  if (!uniquePlayers.length) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/40 dark:border-cyan-900 dark:bg-cyan-950/10" aria-labelledby="trade-research-title">
      <header className="border-b border-cyan-200 px-5 py-4 dark:border-cyan-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Decision research · incoming players</p>
            <h2 id="trade-research-title" className="mt-1 text-xl font-black text-slate-950 dark:text-white">What should you verify before making the trade?</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Recent sourced reporting and observed minutes provide context around the app&apos;s category and salary analysis.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase text-cyan-800 shadow-sm dark:bg-slate-900 dark:text-cyan-300">Context only</span>
        </div>
      </header>
      <div className={`grid gap-4 p-4 ${uniquePlayers.length > 1 ? "xl:grid-cols-2" : ""}`}>
        {uniquePlayers.map((player) => (
          <PlayerResearchCard key={`${league}-${player.nba_id}`} league={league} player={player} />
        ))}
      </div>
      <footer className="border-t border-cyan-200 bg-white/60 px-5 py-3 text-xs text-slate-600 dark:border-cyan-900 dark:bg-slate-950/30 dark:text-slate-300">
        <strong>Important:</strong> this evidence does not change the trade score yet. No matching article is not proof that a player&apos;s role is unchanged.
      </footer>
    </section>
  );
}

function PlayerResearchCard({
  league,
  player,
}: {
  league: "ldl" | "bdb";
  player: ResearchPlayer;
}) {
  const [research, setResearch] = useState<PlayerResearchEvidence | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchPlayerResearch(league, player.nba_id, { signal: controller.signal })
      .then(setResearch)
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(true);
      });
    return () => controller.abort();
  }, [league, player.nba_id]);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950 dark:text-white">{player.name}</h3>
          <p className="text-xs text-slate-500">{[player.nba_team, player.position].filter(Boolean).join(" · ")}</p>
        </div>
        {research && <RoleBadge signal={research.role_signal} />}
      </div>

      {!research && !error && (
        <div className="mt-4 animate-pulse space-y-2" aria-live="polite" aria-label={`Loading research for ${player.name}`}>
          <div className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Research is temporarily unavailable. The trade analysis remains usable, but verify role news independently.
        </div>
      )}
      {research && (
        <div className="mt-4 space-y-4">
          <RoleSignal signal={research.role_signal} />
          <NewsEvidence research={research} />
        </div>
      )}
    </article>
  );
}

function RoleBadge({ signal }: { signal: PlayerResearchEvidence["role_signal"] }) {
  const { label, tone } = rolePresentation(signal);
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${tone}`}>{label}</span>;
}

function RoleSignal({ signal }: { signal: PlayerResearchEvidence["role_signal"] }) {
  const presentation = rolePresentation(signal);
  const hasMinutes = signal.recent_minutes != null && signal.season_minutes != null;
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Observed role signal</p>
      <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{presentation.explanation}</p>
      {hasMinutes && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <span>Last {signal.recent_games}: <strong className="tabular-nums">{signal.recent_minutes} min</strong></span>
          <span>Season: <strong className="tabular-nums">{signal.season_minutes} min</strong></span>
          {signal.minutes_delta != null && <span>Difference: <strong className="tabular-nums">{formatSigned(signal.minutes_delta)} min</strong></span>}
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-500">{roleCaveat(signal)}</p>
    </div>
  );
}

function NewsEvidence({ research }: { research: PlayerResearchEvidence }) {
  if (research.coverage.status === "provider_unavailable") {
    return (
      <div className="rounded-lg border border-amber-200 p-3 text-sm text-amber-800 dark:border-amber-900 dark:text-amber-300">
        ESPN could not be reached. Do not interpret this as a lack of player news.
      </div>
    );
  }
  if (!research.news_evidence.length) {
    return (
      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Verified player news</p>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">No exact player-tagged ESPN story was found in the last {research.coverage.searched_days} days.</p>
        <p className="mt-1 text-xs text-slate-500">Coverage is selective, especially during the offseason. Continue with an independent role check.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Verified player news</p>
        <span className="text-[10px] font-bold uppercase text-slate-400">Exact ESPN player tag</span>
      </div>
      <div className="mt-2 space-y-2">
        {research.news_evidence.map((item) => (
          <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-200 p-3 transition hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-700 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase text-cyan-700 dark:text-cyan-300">{item.provider}</span>
              <time className="text-[10px] text-slate-400" dateTime={item.published_at}>{formatDate(item.published_at)}</time>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{item.headline ?? "Player update"}</p>
            {item.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>}
          </a>
        ))}
      </div>
    </div>
  );
}

function rolePresentation(signal: PlayerResearchEvidence["role_signal"]): {
  label: string;
  explanation: string;
  tone: string;
} {
  if (signal.status === "historical_only") {
    return {
      label: "Historical only",
      explanation: "No fresh role trend is available during the offseason.",
      tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    };
  }
  if (signal.status === "insufficient_evidence") {
    return {
      label: "Insufficient data",
      explanation: "There are not enough stored games to assess a minutes trend.",
      tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    };
  }
  if (signal.direction === "increasing") {
    return {
      label: "Minutes up",
      explanation: "Recent playing time is meaningfully above the season average.",
      tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    };
  }
  if (signal.direction === "decreasing") {
    return {
      label: "Minutes down",
      explanation: "Recent playing time is meaningfully below the season average.",
      tone: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    };
  }
  return {
    label: "Minutes stable",
    explanation: "Recent playing time is close to the season average.",
    tone: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  };
}

function roleCaveat(signal: PlayerResearchEvidence["role_signal"]): string {
  if (signal.status === "historical_only") {
    return `Latest stored game: ${signal.latest_game_date ? formatDate(signal.latest_game_date) : "unknown"}. Historical minutes do not predict the next role.`;
  }
  if (signal.status === "insufficient_evidence") {
    return "Treat role and rotation as unresolved until another reliable source is available.";
  }
  return `Based on ${signal.recent_games} stored games; ${signal.confidence} confidence and not a projection.`;
}

function formatSigned(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}
