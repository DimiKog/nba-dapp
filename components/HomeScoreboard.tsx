"use client";

import { useState } from "react";
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
  showLeague,
}: {
  items: ScoreboardItem[];
  showLeague: boolean;
}) {
  const [mineOnly, setMineOnly] = useState(false);
  const ownedCount = items.filter((item) => item.ownedPlayers.length > 0).length;
  const visible = mineOnly ? items.filter((item) => item.ownedPlayers.length > 0) : items;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          NBA Scoreboard
        </h2>
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
        <p className="text-sm text-slate-400">No games scheduled.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {visible.map((item) => (
            <div
              key={item.id}
              className={`flex min-w-[220px] flex-col gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${item.ownedPlayers.length > 0 ? "border-blue-300 ring-1 ring-blue-200 dark:border-blue-500 dark:ring-blue-900" : "border-slate-200 dark:border-slate-700"}`}
            >
              <div className="flex items-center gap-3">
                <TeamScore team={item.away} showScore={item.showScore} />
                <span className="text-xs font-medium text-slate-400">@</span>
                <TeamScore team={item.home} showScore={item.showScore} />
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${item.completed ? "bg-slate-100 text-slate-500 dark:bg-slate-800" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"}`}>
                  {item.displayStatus}
                </span>
              </div>
              <OwnedPlayersLine players={item.ownedPlayers} showLeague={showLeague} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function OwnedPlayersLine({ players, showLeague }: { players: OwnedPlayer[]; showLeague: boolean }) {
  if (players.length === 0) return null;
  return (
    <p className="text-xs text-blue-700 dark:text-blue-300">
      <span className="font-semibold">Your players: </span>
      {players
        .map((player) => `${player.name}${showLeague ? ` (${player.leagueName})` : ""}${player.injured ? " · injured" : ""}`)
        .join(" · ")}
    </p>
  );
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
