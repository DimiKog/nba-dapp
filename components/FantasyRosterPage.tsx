import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ApiResponseError,
  fetchFantasyRoster,
  fetchFantasyRosterPerformance,
  fetchFantasyTeamCategoryProfile,
  fetchFantasySeasonCategoryActuals,
  photoUrl,
} from "@/lib/api";
import RosterPerformanceTable from "@/components/RosterPerformanceTable";
import TeamPageOverview from "@/components/TeamPageOverview";
import TeamPayrollPanel from "@/components/TeamPayrollPanel";
import TeamSectionNav from "@/components/TeamSectionNav";
import TeamIntelligenceArea from "@/components/TeamIntelligenceArea";
import TeamDataArea from "@/components/TeamDataArea";
import RefreshDataButton from "@/components/RefreshDataButton";
import { notFound } from "next/navigation";
import { loadCurrentFantasyAccess, membershipFor } from "@/lib/fantasySessionServer";
import {
  teamPageCapabilities,
  type TeamPageLeagueSlug,
} from "@/lib/teamPageLeagues";

export default async function FantasyRosterPage({
  league,
  teamId,
  discoveryEnabled = true,
  availabilityNotice = null,
  beforeIntelligence = null,
  afterData = null,
}: {
  league: TeamPageLeagueSlug;
  teamId: string;
  /**
   * When false (GNFC availability not ready), Team Intelligence still mounts
   * but does not fetch or display misleading recommended moves.
   */
  discoveryEnabled?: boolean;
  availabilityNotice?: ReactNode;
  /** Legacy / league-specific content between nav and intelligence (e.g. RosterWatchPanel). */
  beforeIntelligence?: ReactNode;
  /** Legacy / league-specific content after Team Data (e.g. PowerSummary, CategoryNeeds). */
  afterData?: ReactNode;
}) {
  const caps = teamPageCapabilities(league);
  let roster;
  let performance = null;
  let seasonProfile = null;
  let windowProfile = null;
  let seasonActuals = null;
  let isPersonalTeam = false;
  const access = await loadCurrentFantasyAccess();
  const membership = membershipFor(access?.session ?? null, league);
  try {
    const [rosterResult, performanceResult, seasonResult, windowResult, actualsResult] = await Promise.all([
      fetchFantasyRoster(league, teamId),
      fetchFantasyRosterPerformance(league, teamId).catch(() => null),
      fetchFantasyTeamCategoryProfile(league, teamId).catch(() => null),
      fetchFantasyTeamCategoryProfile(league, teamId, "window", 14).catch(() => null),
      fetchFantasySeasonCategoryActuals(league, teamId).catch(() => null),
    ]);
    roster = rosterResult;
    performance = performanceResult;
    seasonProfile = seasonResult;
    windowProfile = windowResult;
    seasonActuals = actualsResult;
    isPersonalTeam = membership?.fantrax_team_id === teamId;
  } catch (error) {
    if (error instanceof ApiResponseError && error.status === 404) notFound();
    throw error;
  }

  const active  = roster.players.filter((p) => p.status === "Active");
  const reserve = roster.players.filter((p) => p.status === "Reserve");
  const ir      = roster.players.filter((p) => p.status === "IR");
  const showIntelligence = isPersonalTeam || Boolean(seasonProfile);
  const showPayroll = caps.showPayroll && Boolean(performance?.payroll);
  // LDL/BδB keep roster-watch cues inside the roster table only (no standalone nav).
  // GNFC still surfaces the legacy RosterWatchPanel + nav anchor.
  const hasWatchNav = caps.usesAvailabilityGate
    && isPersonalTeam
    && Boolean(performance?.players.some((player) => player.roster_watch));

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-10">
      <Link href={caps.standingsHref} className="text-sm text-blue-500 hover:underline">
        ← {caps.standingsLabel}
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {roster.logo && (
            <Image src={roster.logo} alt={roster.team_name ?? ""} width={56} height={56} className="h-14 w-14 rounded-full" unoptimized />
          )}
          <div>
            {caps.brandEyebrow && (
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                {caps.brandEyebrow}
              </p>
            )}
            <h1 className={`${caps.brandEyebrow ? "mt-1 " : ""}text-2xl font-bold text-slate-900 dark:text-slate-100`}>
              {roster.team_name}
            </h1>
            {roster.owner && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {caps.ownerLabel}: {roster.owner}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <RefreshDataButton />
          {isPersonalTeam && caps.showCategoryStrategyLink && (
            <Link href={`/fantasy/${league}/strategy`} className="w-fit rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800">
              Category strategy
            </Link>
          )}
          {isPersonalTeam && caps.showTradeAnalyze && (
            <Link href={`/fantasy/${league}/roster/${encodeURIComponent(teamId)}/trade`} className="w-fit rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
              Analyze a trade →
            </Link>
          )}
        </div>
      </div>

      {availabilityNotice}

      {/* A. OVERVIEW */}
      {performance && (
        <TeamPageOverview
          performance={performance}
          showCap={caps.showCap}
          insightsHref="#intelligence"
          insightsLabel="Team intelligence"
        />
      )}
      <TeamSectionNav
        hasOverview={Boolean(performance)}
        hasIntelligence={showIntelligence}
        hasRecommendedMoves={false}
        hasWatch={hasWatchNav}
        hasPayroll={showPayroll}
        hasAnalysis={false}
        hasTargets={false}
      />

      {beforeIntelligence}

      {/*
        B. TEAM INTELLIGENCE  →  C. TEAM DATA
        Reverse later by swapping these two composition units only.
      */}
      <TeamIntelligenceArea
        league={league}
        teamId={teamId}
        showRecommendedMoves={isPersonalTeam}
        discoveryEnabled={discoveryEnabled}
        seasonProfile={seasonProfile}
        windowProfile={windowProfile}
        seasonActuals={seasonActuals}
      />

      <TeamDataArea>
        <section id="roster" className="scroll-mt-32">
          {performance ? (
            <RosterPerformanceTable performance={performance} league={league} showWatch={isPersonalTeam} />
          ) : roster.players.length === 0 ? (
            <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">No drafted players yet</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Fantrax currently shows an empty roster. This page will show players as the draft and roster updates arrive.
              </p>
            </section>
          ) : (
          <div className="mt-8 space-y-6">
            {[
              { label: "Active", players: active },
              { label: "Reserve", players: reserve },
              { label: "Injured Reserve", players: ir },
            ].map(({ label, players }) =>
              players.length === 0 ? null : (
                <div key={label}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</h2>
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-2 text-left">Player</th>
                          <th className="px-4 py-2 text-left hidden sm:table-cell">NBA Team</th>
                          <th className="px-4 py-2 text-left">Pos</th>
                          {caps.showSalaryInFallbackRoster && (
                            <th className="px-4 py-2 text-right">2026-27 Salary</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {players.map((p) => {
                          const photo = photoUrl(p.photo, p.nba_id);
                          return (
                            <tr key={p.name} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-3">
                                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    {photo ? (
                                      <Image src={photo} alt={p.name} fill className="object-cover" unoptimized />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                                        {p.name[0]}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                                    {p.injury && (
                                      <p className="text-xs text-red-500 truncate max-w-[180px]">{p.injury}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                                {p.nba_team_short || p.nba_team || "—"}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{p.position}</td>
                              {caps.showSalaryInFallbackRoster && (
                                <td className="px-4 py-2.5 text-right font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                                  {p.salary_2026_27 ?? <span className="text-slate-400">—</span>}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
          )}
        </section>

        {showPayroll && performance?.payroll && (
          <TeamPayrollPanel payroll={performance.payroll} />
        )}
      </TeamDataArea>

      {afterData}
    </main>
  );
}
