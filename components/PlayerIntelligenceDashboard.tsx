"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Contract, PlayerIntelligence, PlayerIntelligenceCategory, PlayerIntelligenceSample, photoUrl } from "@/lib/api";

type League = "ldl" | "bdb";
type View = "season" | "recent";
const CONTRACT_YEARS = ["2024-25", "2025-26", "2026-27", "2027-28", "2028-29", "2029-30", "2030-31"] as const;

export default function PlayerIntelligenceDashboard({ intelligence, contract, birthDate, league, source, initiallyWatched }: {
  intelligence: PlayerIntelligence;
  contract: Contract;
  birthDate: string | null;
  league: League | null;
  source: string | null;
  initiallyWatched: boolean;
}) {
  const player = intelligence.player;
  const hasRecent = player.window_stats_intelligence.games > 0;
  const [view, setView] = useState<View>(hasRecent ? "recent" : "season");
  const [watched, setWatched] = useState(initiallyWatched);
  const [watchPending, setWatchPending] = useState(false);
  const [watchError, setWatchError] = useState<string | null>(null);
  const sample = view === "recent" ? player.window_stats_intelligence : player.season_average_intelligence;
  const photo = photoUrl(player.photo, player.nba_id);

  async function addToWatchlist() {
    if (!league || !player.nba_id || watched || watchPending) return;
    setWatchPending(true);
    setWatchError(null);
    try {
      const response = await fetch(`/api/watchlist/${league}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nba_player_id: player.nba_id, notes: "Player Intelligence target", priority: 2 }),
      });
      if (!response.ok) throw new Error();
      setWatched(true);
    } catch {
      setWatchError("The player could not be added to the watchlist.");
    } finally {
      setWatchPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <Link href={backHref(source, league)} className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
        ← {backLabel(source)}
      </Link>

      <header className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-slate-200 shadow-sm dark:bg-slate-700 sm:h-28 sm:w-28">
              {photo ? <Image src={photo} alt={player.name} fill priority unoptimized className="object-cover" /> : <span className="flex h-full items-center justify-center text-4xl font-black text-slate-400">{player.name[0]}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Player intelligence</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">{player.name}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {player.position ?? "Position unavailable"} · {player.nba_team ?? "NBA team unavailable"}{birthDate ? ` · Born ${birthDate}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {league && <span className={`rounded-full px-3 py-1 text-xs font-bold ${player.availability === "free_agent" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{player.availability === "free_agent" ? `${intelligence.league?.name} free agent` : player.fantasy_team?.name ?? "Rostered"}</span>}
                {player.injury && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">{injuryLabel(player.injury)}</span>}
                {!sample.qualified && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">Small sample</span>}
              </div>
            </div>
            {league && player.nba_id && <button type="button" disabled={watched || watchPending} onClick={addToWatchlist} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${watched ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"}`}>{watched ? "Watching" : watchPending ? "Saving…" : "+ Watch"}</button>}
          </div>
          {watchError && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{watchError}</p>}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-fit gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
            <ContextLink label="NBA" active={!league} href={contextHref(player.player_id, null, source)} />
            <ContextLink label="LDL" active={league === "ldl"} href={contextHref(player.player_id, "ldl", source)} />
            <ContextLink label="BδB" active={league === "bdb"} href={contextHref(player.player_id, "bdb", source)} />
          </div>
          <div className="flex w-fit gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
            <ViewButton active={view === "season"} onClick={() => setView("season")}>Season</ViewButton>
            <ViewButton active={view === "recent"} disabled={!hasRecent} onClick={() => setView("recent")}>Recent {intelligence.window.days}d</ViewButton>
          </div>
        </div>
      </header>

      {!hasRecent && <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">No games are available in the latest {intelligence.window.days}-day window. Season intelligence is shown.</div>}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DecisionCard label="Current salary" value={player.salary_2026_27 ?? "$0"} detail={player.salary_2026_27 ? "2026–27 contract" : "No contract · free agent"} />
        <DecisionCard label="NBA rank" value={overallRank(sample, "nba")} detail={overallDetail(sample, "nba")} />
        <DecisionCard label={league ? `${intelligence.league?.name} market` : "Sample"} value={league ? overallRank(sample, "market") : `${sample.games} games`} detail={league ? overallDetail(sample, "market") : `Minimum ${sample.minimum_games} to qualify`} />
        <DecisionCard label="Category profile" value={`${sample.strengths.length} strong`} detail={`${sample.weaknesses.length} ${sample.weaknesses.length === 1 ? "weakness" : "weaknesses"} · ${sample.games} games`} />
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Category intelligence</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{view === "season" ? "Season profile" : `Recent ${intelligence.window.days}-day profile`}</h2></div><p className="text-xs text-slate-500">0 z is NBA average · positive is better · turnovers are inverted</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sample.categories.map((category) => <CategoryCard key={category.key} category={category} league={league} />)}</div>
        <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs dark:border-slate-800"><ProfileChips label="Strengths" values={sample.strengths} tone="green" /><ProfileChips label="Weaknesses" values={sample.weaknesses} tone="red" /></div>
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[0.9fr_1.1fr]"><LatestGame intelligence={intelligence} /><ContractTimeline contract={contract} salaries={player.salaries} /></div>
      <footer className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">Stats updated {formatTimestamp(intelligence.freshness.stats)} · Injury updated {formatTimestamp(intelligence.freshness.injury)}</footer>
    </main>
  );
}

function ContextLink({ label, active, href }: { label: string; active: boolean; href: string }) { return <Link href={href} className={`rounded-lg px-4 py-2 text-sm font-bold ${active ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>{label}</Link>; }
function ViewButton({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" disabled={disabled} onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-bold ${active ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400"}`}>{children}</button>; }
function DecisionCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black tabular-nums text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }

function CategoryCard({ category, league }: { category: PlayerIntelligenceCategory; league: League | null }) {
  const tone = category.z == null ? "neutral" : category.z >= 0.5 ? "strong" : category.z <= -0.5 ? "weak" : "neutral";
  const classes = tone === "strong" ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20" : tone === "weak" ? "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60";
  return <article className={`rounded-2xl border p-4 ${classes}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">{category.label}</p><p className="mt-1 text-2xl font-black tabular-nums text-slate-950 dark:text-white">{formatValue(category)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${tone === "strong" ? "bg-emerald-100 text-emerald-700" : tone === "weak" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>{category.z == null ? "No data" : `${category.z > 0 ? "+" : ""}${category.z.toFixed(2)} z`}</span></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-3 text-xs dark:border-slate-700"><Rank label="NBA rank" rank={category.nba_rank} total={category.nba_of} />{league ? <Rank label="Market rank" rank={category.fantasy_market_rank} total={category.fantasy_market_of} /> : <p className="text-right text-slate-400">NBA-wide context</p>}</div></article>;
}

function Rank({ label, rank, total }: { label: string; rank: number | null; total: number | null }) { return <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 font-bold tabular-nums text-slate-700 dark:text-slate-200">{rank && total ? `#${rank} of ${total}` : "—"}</p></div>; }
function ProfileChips({ label, values, tone }: { label: string; values: string[]; tone: "green" | "red" }) { return <div className="flex flex-wrap items-center gap-1.5"><span className="font-bold text-slate-500">{label}:</span>{values.length ? values.map((value) => <span key={value} className={`rounded-md px-2 py-1 font-bold ${tone === "green" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>{value}</span>) : <span className="text-slate-400">None identified</span>}</div>; }

function LatestGame({ intelligence }: { intelligence: PlayerIntelligence }) {
  const game = intelligence.player.latest_game;
  if (!game) return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-xl font-black">Latest game</h2><p className="mt-4 text-sm text-slate-500">No latest game is available.</p></section>;
  const stats = game.stats;
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Latest game</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{game.is_home ? "vs" : "@"} {game.opponent}</h2><p className="mt-1 text-xs text-slate-500">{game.date} · {game.minutes ?? "—"} minutes</p><div className="mt-5 grid grid-cols-4 gap-2"><GameStat label="PTS" value={stats.points} /><GameStat label="REB" value={stats.oreb + stats.dreb} /><GameStat label="AST" value={stats.assists} /><GameStat label="3PM" value={stats.three_pm} /><GameStat label="STL" value={stats.steals} /><GameStat label="BLK" value={stats.blocks} /><GameStat label="TO" value={stats.turnovers} /><GameStat label="FG" value={`${stats.fgm}/${stats.fga}`} /></div></section>;
}

function GameStat({ label, value }: { label: string; value: number | string }) { return <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 font-black tabular-nums text-slate-900 dark:text-white">{value}</p></div>; }

function ContractTimeline({ contract, salaries }: { contract: Contract; salaries: Record<string, string | null> }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Contract</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Salary timeline</h2><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{CONTRACT_YEARS.map((year) => { const salary = contract[year] ?? salaries[year]; const current = year === "2026-27"; return <div key={year} className={`rounded-xl border p-3 ${current ? "col-span-2 border-blue-600 bg-blue-600 text-white sm:col-span-1 sm:scale-[1.04]" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"}`}><p className={`text-[10px] font-bold ${current ? "text-blue-100" : "text-slate-500"}`}>{year}{current ? " · current" : ""}</p><p className={`mt-1 font-black tabular-nums ${current ? "text-lg" : "text-slate-900 dark:text-white"}`}>{salary ?? "$0"}</p>{!salary && <p className={`text-[10px] ${current ? "text-blue-100" : "text-slate-400"}`}>No salary</p>}</div>; })}</div>{contract.guaranteed && <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-slate-800">Guaranteed: <span className="font-bold text-slate-800 dark:text-slate-200">{contract.guaranteed}</span></p>}</section>;
}

function overallRank(sample: PlayerIntelligenceSample, kind: "nba" | "market") { const overall = sample.overall; if (!overall) return `${sample.categories.length} ranked cats`; const rank = kind === "nba" ? overall.nba_rank : overall.fantasy_market_rank; const total = kind === "nba" ? overall.nba_of : overall.fantasy_market_of; return rank && total ? `#${rank} of ${total}` : "Not ranked"; }
function overallDetail(sample: PlayerIntelligenceSample, kind: "nba" | "market") { if (!sample.overall) return sample.qualified ? "No combined neutral score" : "Small sample"; return kind === "nba" ? `Combined impact · ${sample.overall.z_score > 0 ? "+" : ""}${sample.overall.z_score.toFixed(2)} z` : "Ranked within availability market"; }
function formatValue(category: PlayerIntelligenceCategory) { if (category.value == null) return "—"; if (category.key === "fg_pct" || category.key === "ft_pct") return `${category.value.toFixed(1)}%`; return category.value.toFixed(category.value >= 10 ? 1 : 2); }
function injuryLabel(injury: NonNullable<PlayerIntelligence["player"]["injury"]>) { return [injury.body_part, injury.detail ?? injury.status.replaceAll("_", " ")].filter(Boolean).join(" · "); }
function formatTimestamp(value: string | null) { if (!value) return "unavailable"; return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Athens" }).format(new Date(value)); }
function contextHref(id: number, league: League | null, source: string | null) { const params = new URLSearchParams(); if (league) params.set("league", league); if (source) params.set("from", source); return `/players/${id}${params.size ? `?${params}` : ""}`; }
function backHref(source: string | null, league: League | null) { if (source === "watchlist") return "/watchlist"; if ((source === "roster" || source === "recommendations") && league) return `/fantasy/${league}`; return "/players"; }
function backLabel(source: string | null) { if (source === "watchlist") return "Watchlist"; if (source === "roster" || source === "recommendations") return "Fantasy league"; return "Player Explorer"; }
