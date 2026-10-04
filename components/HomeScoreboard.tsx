"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnedPlayer } from "@/lib/scoreboardOwnership";

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
};

export default function HomeScoreboard({
  items,
  slateDate,
}: {
  items: ScoreboardItem[];
  slateDate: string | null;
}) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const [mineOnly, setMineOnly] = useState(false);
  const ownedCount = items.filter((item) => item.ownedPlayers.length > 0).length;
  const visible = mineOnly ? items.filter((item) => item.ownedPlayers.length > 0) : items;

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

  const slateLabel = formatSlateDate(slateDate);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            NBA Scoreboard
          </h2>
          {slateLabel && <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">NBA date (US) · {slateLabel}</p>}
        </div>
        {ownedCount > 0 && (
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
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No games on the current or next NBA date.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {visible.map((item) => (
            <div
              key={item.id}
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
          ))}
        </div>
      )}
    </section>
  );
}

function OwnedPlayersLine({ players }: { players: OwnedPlayer[] }) {
  if (players.length === 0) return null;
  const leagues = (["ldl", "bdb"] as const)
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
              className={`rounded-md border-l-2 px-2 py-1 text-[11px] font-medium leading-tight ${league === "ldl"
                ? "border-cyan-500 bg-cyan-50 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-200"
                : "border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200"}`}
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
