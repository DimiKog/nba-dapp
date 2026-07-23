"use client";

import Image from "next/image";
import { useState } from "react";
import {
  FantasyPlayerPerformance,
  FantasyPlayerStats,
  FantasyRosterPerformance,
  photoUrl,
} from "@/lib/api";

type View = "window" | "latest" | "season";

const CATEGORIES = [
  ["FG%", "fg_pct"],
  ["3PTM", "three_pm"],
  ["FT%", "ft_pct"],
  ["PTS", "points"],
  ["OREB", "oreb"],
  ["DREB", "dreb"],
  ["AST", "assists"],
  ["STL", "steals"],
  ["BLK", "blocks"],
  ["TO", "turnovers"],
  ["A/TO", "assist_turnover"],
] as const;

const SECTIONS = [
  { label: "Active", status: "Active" },
  { label: "Reserve", status: "Reserve" },
  { label: "Injured Reserve", status: "IR" },
] as const;

function latestStats(player: FantasyPlayerPerformance): FantasyPlayerStats | null {
  if (!player.latest_game) return null;
  const stats = player.latest_game.stats;
  return {
    ...stats,
    games: 1,
    fg_pct: stats.fga ? Math.round((stats.fgm / stats.fga) * 1000) / 10 : null,
    ft_pct: stats.fta ? Math.round((stats.ftm / stats.fta) * 1000) / 10 : null,
    assist_turnover: stats.turnovers
      ? Math.round((stats.assists / stats.turnovers) * 100) / 100
      : null,
  };
}

function statsFor(player: FantasyPlayerPerformance, view: View) {
  if (view === "window") return player.window_stats;
  if (view === "season") return player.season_average;
  return latestStats(player);
}

function formatStat(key: string, value: number | null | undefined, view: View) {
  if (value == null) return "—";
  if (key === "fg_pct" || key === "ft_pct") return `${value.toFixed(1)}%`;
  if (view === "season") return value.toFixed(value >= 10 ? 1 : 2);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function summary(player: FantasyPlayerPerformance, view: View) {
  const stats = statsFor(player, view);
  if (!stats) return "No data";
  if (view === "window" && stats.games === 0) return "No games in this window";
  const rebounds = stats.oreb + stats.dreb;
  return `${formatStat("points", stats.points, view)} PTS · ${formatStat("dreb", rebounds, view)} REB · ${formatStat("assists", stats.assists, view)} AST`;
}

function freshnessLabel(value: string | null) {
  if (!value) return "Refresh time unavailable";
  return `Updated ${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Athens",
  }).format(new Date(value))}`;
}

export default function RosterPerformanceTable({
  performance,
}: {
  performance: FantasyRosterPerformance;
}) {
  const [view, setView] = useState<View>("window");
  const [expanded, setExpanded] = useState<string | null>(null);
  const injured = performance.players.filter((player) => player.injury);
  const freshest = performance.players
    .map((player) => player.freshness.stats)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roster</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{performance.players.length}</p>
          <p className="text-xs text-slate-500">players</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Injury alerts</p>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{injured.length}</p>
          <p className="truncate text-xs text-red-600/80 dark:text-red-400/80">
            {injured.map((player) => player.short_name).join(", ") || "No active alerts"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data freshness</p>
          <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{freshnessLabel(freshest)}</p>
          <p className="text-xs text-slate-500">{performance.window.from} – {performance.window.to}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {([
            ["window", `Last ${performance.window.days} days`],
            ["latest", "Latest game"],
            ["season", "Season average"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === key
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Select a player for all 11 categories</p>
      </div>

      <div className="mt-6 space-y-6">
        {SECTIONS.map(({ label, status }) => {
          const players = performance.players.filter((player) => player.status === status);
          if (!players.length) return null;
          return (
            <section key={status}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {players.map((player) => {
                  const isExpanded = expanded === player.name;
                  const photo = photoUrl(player.photo, player.nba_id);
                  const stats = statsFor(player, view);
                  return (
                    <div key={player.name} className="border-b border-slate-100 bg-white last:border-b-0 dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpanded(isExpanded ? null : player.name)}
                        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 sm:grid-cols-[minmax(220px,1fr)_minmax(210px,1fr)_auto]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            {photo ? <Image src={photo} alt="" fill className="object-cover" unoptimized /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">{player.name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {player.nba_team_short || "N/A"} · {player.position}
                            </span>
                            {player.injury && (
                              <span className="mt-1 block truncate text-xs font-medium text-red-500">
                                {player.injury.body_part ? `${player.injury.body_part} · ` : ""}{player.injury.detail}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="hidden min-w-0 sm:block">
                          <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-300">{summary(player, view)}</span>
                          {view === "latest" && player.latest_game && (
                            <span className="block text-xs text-slate-500">
                              {player.latest_game.date} {player.latest_game.is_home ? "vs" : "@"} {player.latest_game.opponent}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="hidden text-right text-xs font-semibold text-blue-700 dark:text-blue-400 md:block">
                            {player.salary_2026_27 ?? "—"}
                          </span>
                          <span aria-hidden="true" className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>⌄</span>
                        </span>
                        <span className="col-span-2 truncate text-xs font-medium text-slate-600 dark:text-slate-400 sm:hidden">
                          {summary(player, view)}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/50">
                          {view === "window" && stats?.games === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-700">
                              No NBA games in the selected seven-day window. Season averages remain available above.
                            </p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                              {CATEGORIES.map(([label, key]) => (
                                <div key={key} className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                                  <p className="mt-1 font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                    {formatStat(key, stats?.[key], view)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>{view === "window" ? `${stats?.games ?? 0} games` : view === "season" ? `${stats?.games ?? 0} season games` : player.latest_game ? `${player.latest_game.minutes ?? "—"} minutes` : "No latest game"}</span>
                            {player.category_strengths.length > 0 && (
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                Strengths: {player.category_strengths.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
