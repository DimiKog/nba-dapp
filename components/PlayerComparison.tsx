"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import {
  fetchLeaguePlayerExplorer,
  photoUrl,
  type FantasyPlayerPerformance,
  type FantasyPlayerStats,
  type LeaguePlayerExplorer,
} from "@/lib/api";
import {
  fantasyStatValue,
  formatFantasyStat,
  resolveFantasyCategories,
  type FantasyCategory,
} from "@/lib/fantasyCategories";

type LeagueSlug = "ldl" | "bdb";
type StatsView = "season" | "window";

const SALARY_SEASONS = ["2026-27", "2027-28", "2028-29", "2029-30", "2030-31"] as const;

export default function PlayerComparison() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLeague = searchParams.get("league") === "bdb" ? "bdb" : "ldl";
  const initialIds = searchParams.getAll("player").slice(0, 4);
  const [league, setLeague] = useState<LeagueSlug>(initialLeague);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [payload, setPayload] = useState<LeaguePlayerExplorer | null>(null);
  const [statsView, setStatsView] = useState<StatsView>("season");
  const [candidateId, setCandidateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchLeaguePlayerExplorer(league)
      .then((data) => {
        if (!active) return;
        setPayload(data);
        setStatsView(data.ranking_basis);
      })
      .catch(() => {
        if (active) setError(`Could not load ${league === "ldl" ? "LDL" : "BδB"} comparison data.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [league]);

  const selectedPlayers = useMemo(
    () => selectedIds
      .map((id) => payload?.players.find((player) => playerKey(player) === id))
      .filter((player): player is FantasyPlayerPerformance => Boolean(player)),
    [payload, selectedIds],
  );
  const availablePlayers = useMemo(
    () => [...(payload?.players ?? [])]
      .filter((player) => !selectedIds.includes(playerKey(player)))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [payload, selectedIds],
  );
  const categories = useMemo(
    () => resolveFantasyCategories(payload?.categories ?? []),
    [payload],
  );
  const hasWindowGames = payload?.players.some((player) => player.window_stats.games > 0) ?? false;

  function updateSelection(ids: string[]) {
    const next = ids.slice(0, 4);
    setSelectedIds(next);
    router.replace(comparisonHref(league, next), { scroll: false });
  }

  function addPlayer() {
    if (!candidateId || selectedIds.length >= 4) return;
    updateSelection([...selectedIds, candidateId]);
    setCandidateId("");
  }

  function changeLeague(next: LeagueSlug) {
    if (next === league) return;
    setLoading(true);
    setError(null);
    setLeague(next);
    setPayload(null);
    setSelectedIds([]);
    setCandidateId("");
    router.replace(comparisonHref(next, []), { scroll: false });
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/players" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            ← Player Explorer
          </Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
            Fantasy intelligence
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Player comparison</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compare category value, availability and contracts without hiding trade-offs behind one winner score.
          </p>
        </div>
        <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(["ldl", "bdb"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => changeLeague(item)}
              className={`rounded-lg px-6 py-2 text-sm font-bold ${
                league === item
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {item === "ldl" ? "LDL" : "BδB"}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Add player</span>
            <select
              value={candidateId}
              onChange={(event) => setCandidateId(event.target.value)}
              disabled={selectedIds.length >= 4 || loading}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Choose from {league === "ldl" ? "LDL" : "BδB"}…</option>
              {availablePlayers.map((player) => (
                <option key={playerKey(player)} value={playerKey(player)}>
                  {player.name} · {player.fantasy_team?.name ?? "Unknown team"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addPlayer}
            disabled={!candidateId || selectedIds.length >= 4}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            Add to comparison
          </button>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <ViewButton active={statsView === "season"} onClick={() => setStatsView("season")}>
              Season
            </ViewButton>
            <ViewButton
              active={statsView === "window"}
              disabled={!hasWindowGames}
              onClick={() => setStatsView("window")}
            >
              Last {payload?.window.days ?? 7} days
            </ViewButton>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
          <span>{selectedPlayers.length}/4 players selected · minimum 2</span>
          <span>{payload?.categories.length ?? 0} league categories · URL updates automatically</span>
        </div>
      </section>

      {loading && <ComparisonLoading />}
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {!loading && payload && selectedPlayers.length < 2 && (
        <EmptyComparison selected={selectedPlayers} />
      )}
      {!loading && payload && selectedPlayers.length >= 2 && (
        <ComparisonBoard
          players={selectedPlayers}
          league={league}
          categories={categories}
          statsView={statsView}
          onRemove={(player) => updateSelection(selectedIds.filter((id) => id !== playerKey(player)))}
        />
      )}
    </main>
  );
}

function ComparisonBoard({
  players,
  league,
  categories,
  statsView,
  onRemove,
}: {
  players: FantasyPlayerPerformance[];
  league: LeagueSlug;
  categories: FantasyCategory[];
  statsView: StatsView;
  onRemove: (player: FantasyPlayerPerformance) => void;
}) {
  const gridStyle = {
    gridTemplateColumns: `minmax(150px, 0.8fr) repeat(${players.length}, minmax(190px, 1fr))`,
    minWidth: `${150 + players.length * 190}px`,
  };

  return (
    <section className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <div style={gridStyle}>
          <div className="grid border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800" style={gridStyle}>
            <div className="p-4 text-xs font-bold uppercase tracking-wide text-slate-500">Player</div>
            {players.map((player) => (
              <PlayerHeader key={playerKey(player)} player={player} league={league} onRemove={() => onRemove(player)} />
            ))}
          </div>

          <ComparisonSection title={`${statsView === "season" ? "Season" : "Recent"} categories`} gridStyle={gridStyle}>
            {categories.map((category) => (
              <CategoryRow
                key={category.key}
                category={category}
                players={players}
                statsView={statsView}
                gridStyle={gridStyle}
              />
            ))}
          </ComparisonSection>

          <ComparisonSection title="Fantasy context" gridStyle={gridStyle}>
            <ValueRow label="Impact rank" values={players.map((player) => player.impact_rank ? `#${player.impact_rank}` : "—")} gridStyle={gridStyle} />
            <ValueRow label="Impact score" values={players.map((player) => player.impact_score?.toFixed(2) ?? "—")} gridStyle={gridStyle} />
            <ValueRow label="Roster status" values={players.map((player) => player.status)} gridStyle={gridStyle} />
            <ValueRow label="Injury" values={players.map((player) => injuryLabel(player))} gridStyle={gridStyle} tone="injury" />
            <ValueRow label="Strengths" values={players.map((player) => player.category_strengths.join(", ") || "—")} gridStyle={gridStyle} />
          </ComparisonSection>

          <ComparisonSection title="Contract timeline" gridStyle={gridStyle}>
            {SALARY_SEASONS.map((season, index) => (
              <ValueRow
                key={season}
                label={`${season}${index === 0 ? " · current" : ""}`}
                values={players.map((player) => player.salaries?.[season] ?? "$0 · Free agent")}
                gridStyle={gridStyle}
                emphasized={index === 0}
              />
            ))}
          </ComparisonSection>
        </div>
      </div>
    </section>
  );
}

function PlayerHeader({
  player,
  league,
  onRemove,
}: {
  player: FantasyPlayerPerformance;
  league: LeagueSlug;
  onRemove: () => void;
}) {
  const photo = photoUrl(player.photo, player.nba_id);
  return (
    <div className="relative border-l border-slate-200 p-4 dark:border-slate-700">
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${player.name}`}
        className="absolute right-3 top-3 rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-400 shadow-sm hover:text-red-600 dark:bg-slate-900"
      >
        ×
      </button>
      <div className="flex items-center gap-3 pr-7">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-full bg-slate-200 object-cover" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 font-black text-slate-500">
            {player.name.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-black text-slate-950 dark:text-white">{player.name}</p>
          <p className="truncate text-xs text-slate-500">{player.nba_team} · {player.position}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <TeamLogo league={league} name={player.fantasy_team?.name ?? "Unknown"} logo={player.fantasy_team?.logo ?? null} size={24} />
        <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{player.fantasy_team?.name}</span>
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  players,
  statsView,
  gridStyle,
}: {
  category: FantasyCategory;
  players: FantasyPlayerPerformance[];
  statsView: StatsView;
  gridStyle: React.CSSProperties;
}) {
  const stats = players.map((player) => statsFor(player, statsView));
  const values = stats.map((item) => fantasyStatValue(item, category));
  const available = values.filter((value): value is number => value !== null);
  const leader = available.length > 1
    ? (category.lowerIsBetter ? Math.min(...available) : Math.max(...available))
    : null;

  return (
    <div className="grid border-b border-slate-100 last:border-b-0 dark:border-slate-800" style={gridStyle}>
      <div className="px-4 py-3 text-xs font-bold text-slate-500">
        {category.label}
        {category.lowerIsBetter && <span className="ml-1 font-normal text-slate-400">↓</span>}
      </div>
      {players.map((player, index) => {
        const leading = leader !== null && values[index] === leader;
        return (
          <div
            key={playerKey(player)}
            className={`border-l border-slate-100 px-4 py-3 text-right font-bold tabular-nums dark:border-slate-800 ${
              leading
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "text-slate-800 dark:text-slate-200"
            }`}
          >
            {formatFantasyStat(stats[index], category)}
          </div>
        );
      })}
    </div>
  );
}

function ComparisonSection({
  title,
  children,
  gridStyle,
}: {
  title: string;
  children: React.ReactNode;
  gridStyle: React.CSSProperties;
}) {
  return (
    <>
      <div className="grid bg-blue-50 dark:bg-blue-950/30" style={gridStyle}>
        <div className="px-4 py-2 text-xs font-black uppercase tracking-wide text-blue-700 dark:text-blue-300">{title}</div>
        <div className="col-span-full hidden" />
      </div>
      {children}
    </>
  );
}

function ValueRow({
  label,
  values,
  gridStyle,
  tone,
  emphasized,
}: {
  label: string;
  values: string[];
  gridStyle: React.CSSProperties;
  tone?: "injury";
  emphasized?: boolean;
}) {
  return (
    <div className={`grid border-b border-slate-100 last:border-b-0 dark:border-slate-800 ${emphasized ? "bg-blue-50/60 dark:bg-blue-950/20" : ""}`} style={gridStyle}>
      <div className="px-4 py-3 text-xs font-bold text-slate-500">{label}</div>
      {values.map((value, index) => (
        <div
          key={`${index}-${value}`}
          className={`border-l border-slate-100 px-4 py-3 text-right text-sm font-semibold dark:border-slate-800 ${
            tone === "injury" && value !== "Healthy"
              ? "text-red-600 dark:text-red-400"
              : emphasized
                ? "font-black text-blue-700 dark:text-blue-300"
                : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {value}
        </div>
      ))}
    </div>
  );
}

function EmptyComparison({ selected }: { selected: FantasyPlayerPerformance[] }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-lg font-black text-slate-800 dark:text-slate-100">
        {selected.length ? "Add one more player" : "Choose players to compare"}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Select between two and four players. Category leaders will be highlighted automatically.
      </p>
    </div>
  );
}

function ViewButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-bold ${
        active
          ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
          : "text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
      }`}
    >
      {children}
    </button>
  );
}

function ComparisonLoading() {
  return <div className="mt-6 h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
}

function statsFor(player: FantasyPlayerPerformance, view: StatsView): FantasyPlayerStats | null {
  return view === "season" ? player.season_average : player.window_stats;
}

function injuryLabel(player: FantasyPlayerPerformance) {
  if (!player.injury) return "Healthy";
  return `${player.injury.body_part ? `${player.injury.body_part} · ` : ""}${player.injury.detail ?? player.injury.status}`;
}

function playerKey(player: FantasyPlayerPerformance) {
  return `${player.fantasy_team?.id ?? "unknown"}:${player.nba_id ?? player.name}`;
}

function comparisonHref(league: LeagueSlug, ids: string[]) {
  const params = new URLSearchParams({ league });
  ids.forEach((id) => params.append("player", id));
  return `/players/compare?${params.toString()}`;
}
