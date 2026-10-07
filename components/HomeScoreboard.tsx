"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnedPlayer } from "@/lib/scoreboardOwnership";
import { LEAGUE_PRESENTATION, LEAGUE_SLUGS } from "@/lib/leagues";

type ScoreboardTeam = {
  name: string;
  short: string;
  logo: string | null;
  score: string | null;
  winner: boolean;
};

export type ScoreboardItem = {
  id: string;
  away: ScoreboardTeam;
  home: ScoreboardTeam;
  completed: boolean;
  showScore: boolean;
  displayStatus: string;
  ownedPlayers: OwnedPlayer[];
  expiresAt: string | null;
};

export default function HomeScoreboard({
  items,
  slateDate,
  previousSlateDate,
}: {
  items: ScoreboardItem[];
  slateDate: string | null;
  previousSlateDate: string | null;
}) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const [mineOnly, setMineOnly] = useState(false);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const previousExpiry = items.find((item) => item.expiresAt)?.expiresAt ?? null;
  const showPrevious = Boolean(previousExpiry && expiredAt !== previousExpiry);
  const currentItems = items.filter((item) => !item.expiresAt);
  const previousItems = showPrevious ? items.filter((item) => item.expiresAt) : [];
  const activeItems = [...currentItems, ...previousItems];
  const ownedCount = activeItems.filter((item) => item.ownedPlayers.length > 0).length;
  const visibleCurrent = mineOnly ? currentItems.filter((item) => item.ownedPlayers.length > 0) : currentItems;
  const visiblePrevious = mineOnly ? previousItems.filter((item) => item.ownedPlayers.length > 0) : previousItems;

  useEffect(() => {
    lastRefresh.current = Date.now();
    const refreshIfStale = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh.current < 60_000) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [router]);

  useEffect(() => {
    if (!previousExpiry) return;
    const delay = Math.max(0, Date.parse(previousExpiry) - Date.now());
    const timer = window.setTimeout(() => setExpiredAt(previousExpiry), delay);
    return () => window.clearTimeout(timer);
  }, [previousExpiry]);

  const slateLabel = formatSlateDate(slateDate);
  const previousLabel = formatSlateDate(previousSlateDate);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            NBA Scoreboard
          </h2>
          {slateLabel && <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">NBA date (US) · {slateLabel}</p>}
        </div>
        {(ownedCount > 0 || mineOnly) && (
          <button
            type="button"
            aria-pressed={mineOnly}
            onClick={() => setMineOnly((value) => !value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              mineOnly
                ? "border-blue-500 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500"
            }`}
          >
            Mine only ({ownedCount})
          </button>
        )}
      </div>
      {currentItems.length === 0 ? (
        <p className="text-sm text-slate-400">No games on the current or next NBA date.</p>
      ) : visibleCurrent.length === 0 ? (
        <p className="text-sm text-slate-400">No games with your players on this slate.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {visibleCurrent.map((item) => <ScoreboardCard key={item.id} item={item} />)}
        </div>
      )}
      {visiblePrevious.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Yesterday&apos;s results{previousLabel ? ` · ${previousLabel}` : ""}
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">Until 19:00 Athens</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {visiblePrevious.map((item) => <ScoreboardCard key={item.id} item={item} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function ScoreboardCard({ item }: { item: ScoreboardItem }) {
  return (
    <div
      className={`flex min-w-[260px] max-w-sm flex-col gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${item.ownedPlayers.length > 0 ? "border-blue-300 ring-1 ring-blue-200 dark:border-blue-500 dark:ring-blue-900" : "border-slate-200 dark:border-slate-700"}`}
    >
      <div className="flex items-center gap-3">
        <TeamScore team={item.away} showScore={item.showScore} />
        <span className="text-xs font-medium text-slate-400">@</span>
        <TeamScore team={item.home} showScore={item.showScore} />
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${item.completed
          ? "bg-slate-100 text-slate-500 dark:bg-slate-800"
          : item.showScore
            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"}`}>
          {item.displayStatus}
        </span>
      </div>
      <OwnedPlayersLine players={item.ownedPlayers} />
    </div>
  );
}

function OwnedPlayersLine({ players }: { players: OwnedPlayer[] }) {
  if (players.length === 0) return null;
  const leagues = LEAGUE_SLUGS
    .map((league) => ({ league, players: players.filter((player) => player.league === league) }))
    .filter((group) => group.players.length > 0);
  return (
    <div className="flex gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
      {leagues.map(({ league, players: leaguePlayers }) => (
        <div key={league} className="flex min-w-0 flex-1 flex-col gap-1">
          {leaguePlayers.map((player, index) => (
            <span
              key={`${player.name}-${index}`}
              aria-label={`${player.leagueName}: ${player.name}${player.injured ? ", injured" : ""}`}
              className={`rounded-md border-l-2 px-2 py-1 text-[11px] font-medium leading-tight ${LEAGUE_PRESENTATION[league].scoreboardPlayerClasses}`}
            >
              {player.name}{player.injured && <span aria-hidden="true" className="ml-1 text-rose-500">●</span>}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function formatSlateDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function TeamScore({ team, showScore }: { team: ScoreboardTeam; showScore: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {team.logo && <img src={team.logo} alt={team.short} className="h-7 w-7 object-contain" />}
      <div>
        <p className={`text-sm font-bold ${team.winner ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
          {team.short}
        </p>
        {showScore && (
          <p className={`text-sm tabular-nums ${team.winner ? "font-bold text-slate-900 dark:text-slate-100" : "text-slate-500"}`}>
            {team.score ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}
