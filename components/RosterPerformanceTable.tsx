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

const SALARY_SEASONS = ["2026-27", "2027-28", "2028-29", "2029-30", "2030-31"] as const;

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type PayrollSeason = NonNullable<FantasyRosterPerformance["payroll"]>["seasons"][number];

function capStatusLabel(status: PayrollSeason["status"]) {
  if (status === "under") return "Under cap";
  if (status === "over") return "Over cap";
  return "Cap not set";
}

function capStatusClasses(status: PayrollSeason["status"]) {
  if (status === "under") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (status === "over") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
}

function playerKey(player: FantasyPlayerPerformance) {
  return String(player.player_id ?? player.fantrax_scorer_id ?? player.name);
}

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
      : stats.assists || null,
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

function statusClasses(status: FantasyPlayerPerformance["status"]) {
  if (status === "Active") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (status === "IR") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
}

export default function RosterPerformanceTable({
  performance,
}: {
  performance: FantasyRosterPerformance;
}) {
  const hasWindowGames = performance.players.some((player) => player.window_stats.games > 0);
  const [view, setView] = useState<View>(hasWindowGames ? "window" : "season");
  const [selectedKey, setSelectedKey] = useState(() => (
    performance.players[0] ? playerKey(performance.players[0]) : ""
  ));
  const selected = (
    performance.players.find((player) => playerKey(player) === selectedKey)
    ?? performance.players[0]
  );
  const injured = performance.players.filter((player) => player.injury);
  const freshest = performance.players
    .map((player) => player.freshness.stats)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  if (!selected) return null;

  const selectedStats = statsFor(selected, view);
  const selectedPhoto = photoUrl(selected.photo, selected.nba_id);
  const selectPlayer = (key: string) => {
    setSelectedKey(key);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() => {
        document.getElementById("player-performance-detail")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

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

      {performance.payroll && (
      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Team payroll</h2>
            <p className="text-xs text-slate-500">Active, Reserve and Injured Reserve players</p>
          </div>
          <p className="text-xs text-slate-500">Players without a contract count as $0</p>
        </div>
        <div className="grid gap-px bg-slate-200 dark:bg-slate-700 sm:grid-cols-2 xl:grid-cols-5">
          {performance.payroll.seasons.map((season) => (
            <div key={season.season} className="bg-white p-4 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-500">{season.season}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${capStatusClasses(season.status)}`}>
                  {capStatusLabel(season.status)}
                </span>
              </div>
              <p className="mt-2 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatMoney(season.total)}
              </p>
              {season.cap != null ? (
                <p className="mt-1 text-xs text-slate-500">
                  Cap {formatMoney(season.cap)}{season.cap_provisional ? " · provisional" : ""}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">No cap configured</p>
              )}
              {season.remaining != null && (
                <p className={`mt-1 text-xs font-medium ${season.remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {season.remaining >= 0 ? `${formatMoney(season.remaining)} available` : `${formatMoney(Math.abs(season.remaining))} over`}
                </p>
              )}
              {season.free_agents > 0 && (
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {season.free_agents} free {season.free_agents === 1 ? "agent" : "agents"} · $0
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {!hasWindowGames && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          No NBA games were played in the last {performance.window.days} days. Season averages are shown by default.
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]">
        <div className="space-y-5">
          {SECTIONS.map(({ label, status }) => {
            const players = performance.players.filter((player) => player.status === status);
            if (!players.length) return null;
            return (
              <section key={status}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</h2>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  {players.map((player) => {
                    const key = playerKey(player);
                    const isSelected = key === playerKey(selected);
                    const photo = photoUrl(player.photo, player.nba_id);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => selectPlayer(key)}
                        className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors last:border-b-0 dark:border-slate-800 ${
                          isSelected
                            ? "bg-blue-50 ring-1 ring-inset ring-blue-300 dark:bg-blue-950/40 dark:ring-blue-700"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          {photo ? (
                            <Image src={photo} alt="" fill className="object-cover" unoptimized />
                          ) : (
                            <span className="flex h-full items-center justify-center text-sm text-slate-400">{player.name[0]}</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{player.name}</span>
                            {player.injury && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="Injury alert" />}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {player.nba_team_short || "N/A"} · {player.position}
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                            {summary(player, view)}
                          </span>
                        </span>
                        <span className="text-slate-400" aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside
          id="player-performance-detail"
          className="scroll-mt-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:sticky lg:top-20"
        >
          <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-5 dark:border-slate-700 dark:from-slate-900 dark:to-blue-950/40">
            <div className="flex items-start gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-200 shadow-sm dark:bg-slate-700">
                {selectedPhoto ? (
                  <Image src={selectedPhoto} alt={selected.name} fill className="object-cover" priority unoptimized />
                ) : (
                  <span className="flex h-full items-center justify-center text-3xl text-slate-400">{selected.name[0]}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-bold text-slate-900 dark:text-slate-100">{selected.name}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClasses(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.nba_team_short || selected.nba_team || "N/A"} · {selected.position}
                </p>
                <p className="mt-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                  {selected.salary_2026_27 ?? "Salary unavailable"}
                </p>
              </div>
            </div>

            {selected.injury && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/40">
                <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Injury alert</p>
                <p className="mt-0.5 text-sm font-medium text-red-800 dark:text-red-300">
                  {selected.injury.body_part ? `${selected.injury.body_part} · ` : ""}{selected.injury.detail}
                </p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {SALARY_SEASONS.map((season) => (
                <div key={season} className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[10px] font-semibold text-slate-500">{season}</p>
                  <p className="mt-0.5 truncate text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
                    {selected.salaries?.[season] ?? (season === "2026-27" ? selected.salary_2026_27 : null) ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {([
                ["window", `Last ${performance.window.days} days`],
                ["latest", "Latest game"],
                ["season", "Season average"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs ${
                    view === key
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {view === "latest" && selected.latest_game && (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {selected.latest_game.date} · {selected.latest_game.is_home ? "vs" : "@"} {selected.latest_game.opponent}
                </span>
                <span className="text-slate-500">{selected.latest_game.minutes ?? "—"} min</span>
              </div>
            )}

            {view === "window" && selectedStats?.games === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No games in this window</p>
                <button type="button" onClick={() => setView("season")} className="mt-2 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  Show season averages
                </button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {CATEGORIES.map(([label, key]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatStat(key, selectedStats?.[key], view)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Fantasy impact</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selected.impact_rank ? `#${selected.impact_rank} on your roster` : "Available when the window has games"}
                </p>
                {selected.category_strengths.length > 0 && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Strengths: {selected.category_strengths.join(", ")}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sample</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {view === "latest"
                    ? selected.latest_game ? "1 game" : "No latest game"
                    : `${selectedStats?.games ?? 0} games`}
                </p>
                <p className="mt-1 text-xs text-slate-500">{performance.window.season} season</p>
              </div>
            </div>

            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
              {freshnessLabel(selected.freshness.stats)}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
