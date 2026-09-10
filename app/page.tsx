import Image from "next/image";
import Link from "next/link";
import {
  fetchScoreboard,
  fetchNews,
  fetchFantasyStandings,
  fetchFantasyMatchupsForTeam,
  fetchFantasyRosterPerformance,
  fetchFantasyTeamCategoryProfile,
  fetchFreeAgentRadar,
  photoUrl,
  type FantasyFreeAgentRadar,
  type FantasyMatchup,
  type FantasyMatchupPeriod,
  type FantasyRosterPerformance,
  type FantasyTeamCategoryProfile,
} from "@/lib/api";
import HomeLeagueStandings from "@/components/HomeLeagueStandings";
import ManagerTodayRecommendation from "@/components/ManagerTodayRecommendation";
import { loadCurrentFantasyContext } from "@/lib/fantasySessionServer";

export default async function Home() {
  const context = await loadCurrentFantasyContext().catch(() => ({
    identity: null,
    identityHeaders: null,
    session: null,
  }));
  const session = context.session;
  const [games, news, ldlTeams, bdbTeams, personalTeams, radarPanels] = await Promise.all([
    fetchScoreboard(),
    fetchNews(6),
    fetchFantasyStandings("ldl").catch(() => []),
    fetchFantasyStandings("bdb").catch(() => []),
    Promise.all(
      (session?.memberships ?? [])
        .filter((membership) => (
          membership.league_slug === "ldl" || membership.league_slug === "bdb"
        ) && membership.fantrax_team_id)
        .map(async (membership) => {
            const slug = membership.league_slug as "ldl" | "bdb";
            const teamId = membership.fantrax_team_id!;
            const [matchup, performance, profile] = await Promise.all([
              fetchFantasyMatchupsForTeam(slug, teamId).catch(() => null),
              fetchFantasyRosterPerformance(slug, teamId).catch(() => null),
              fetchFantasyTeamCategoryProfile(slug, teamId).catch(() => null),
            ]);
            return {
              league: slug,
              leagueName: slug === "ldl" ? "LDL" : "BδB",
              teamName: membership.franchise_name,
              teamId,
              matchup,
              performance,
              profile,
            };
          }),
    ).catch(() => []),
    Promise.all([
      fetchFreeAgentRadar("ldl").catch(() => null),
      fetchFreeAgentRadar("bdb").catch(() => null),
    ]),
  ]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-8 px-4 py-8">

      <ManagerTodayHeader
        displayName={session?.user.display_name ?? null}
        teamCount={personalTeams.length}
      />

      <NeedsAttention teams={personalTeams} />

      <PersonalTeamsGrid
        teams={personalTeams}
        hasAccessIdentity={Boolean(context.identity)}
        hasSession={Boolean(session)}
      />

      {/* Preseason games intentionally remain visible; scoreboard data is display-only and is not consumed by any fantasy model. */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          NBA Scoreboard
        </h2>
        {games.length === 0 ? (
          <p className="text-sm text-slate-400">No games scheduled.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {games.map((g) => {
              const isLive = !g.completed && g.status !== "Scheduled";
              const showScore = g.completed || isLive;
              const displayStatus = g.completed || isLive
                ? g.status
                : formatGameDate(g.date) ?? g.status;

              return (
                <div key={g.id} className="flex min-w-[220px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <TeamScore team={g.away} showScore={showScore} />
                  <span className="text-xs font-medium text-slate-400">@</span>
                  <TeamScore team={g.home} showScore={showScore} />
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${g.completed ? "bg-slate-100 text-slate-500 dark:bg-slate-800" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"}`}>
                    {displayStatus}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <HomeRadarPanels radars={radarPanels} />

      {/* Fantasy standings + News */}
      <div className="grid gap-6 lg:grid-cols-2">
        <HomeLeagueStandings ldlTeams={ldlTeams} bdbTeams={bdbTeams} />

        {/* News */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">NBA News</h2>
          <div className="space-y-3">
            {news.map((item, i) => (
              <a
                key={i}
                href={item.link ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
              >
                {item.image && (
                  <img src={item.image} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 transition-colors">
                    {item.headline}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {item.published ? new Date(item.published).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ManagerTodayHeader({
  displayName,
  teamCount,
}: {
  displayName: string | null;
  teamCount: number;
}) {
  const firstName = displayName?.trim().split(/\s+/)[0] ?? null;
  const greeting = greetingForAthens();
  return (
    <section className="overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 py-7 text-white shadow-lg shadow-blue-950/10 dark:border-blue-800">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">Manager Today</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
        {firstName ? `${greeting}, ${firstName}` : "Your fantasy command center"}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
        {teamCount > 0
          ? `The most useful signals and next actions across ${teamCount === 1 ? "your team" : `your ${teamCount} teams`}.`
          : "Sign in to see your teams, urgent checks and best available moves in one place."}
      </p>
    </section>
  );
}

type AttentionItem = {
  key: string;
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "warning";
};

function NeedsAttention({ teams }: { teams: PersonalTeamDashboard[] }) {
  const rosterItems: AttentionItem[] = [];
  const capItems: AttentionItem[] = [];
  const injuryItems: AttentionItem[] = [];

  for (const dashboard of teams) {
    const performance = dashboard.performance;
    const rosterHref = `/fantasy/${dashboard.league}/roster/${encodeURIComponent(dashboard.teamId)}`;
    const minimum = performance?.league.roster_rules?.minimum_players;
    const rosterCount = performance?.players.length;
    if (minimum != null && rosterCount != null && rosterCount < minimum) {
      rosterItems.push({
        key: `${dashboard.league}-roster`,
        title: `${dashboard.teamName} roster is incomplete`,
        detail: `${rosterCount} of at least ${minimum} players. Recommendations remain provisional.`,
        href: `/watchlist?league=${dashboard.league}`,
        tone: "critical",
      });
    }

    const remaining = performance?.payroll?.seasons[0]?.remaining;
    if (remaining != null && remaining < 0) {
      capItems.push({
        key: `${dashboard.league}-cap`,
        title: `${dashboard.teamName} is ${compactMoney(Math.abs(remaining))} over the cap`,
        detail: "Review salaries before the next roster decision.",
        href: rosterHref,
        tone: "critical",
      });
    }

    const injuries = performance?.players.filter((player) => player.injury) ?? [];
    if (injuries.length > 0) {
      injuryItems.push({
        key: `${dashboard.league}-injuries`,
        title: `${injuries.length} injury ${injuries.length === 1 ? "alert" : "alerts"} on ${dashboard.teamName}`,
        detail: injuries.slice(0, 3).map((player) => player.short_name).join(" · "),
        href: rosterHref,
        tone: "warning",
      });
    }
  }

  const items = [...rosterItems, ...capItems, ...injuryItems];
  if (teams.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Needs attention</h2>
          <p className="mt-1 text-sm text-slate-500">Roster checks first, then cap and health.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      {items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${
                item.tone === "critical"
                  ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
              }`}
            >
              <p className={`text-sm font-black ${item.tone === "critical" ? "text-rose-800 dark:text-rose-300" : "text-amber-800 dark:text-amber-300"}`}>
                {item.title}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{item.detail}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">No urgent roster, cap or injury actions.</p>
          <p className="mt-1 text-xs text-slate-500">The free-agent scan below may still find an upgrade.</p>
        </div>
      )}
    </section>
  );
}

function HomeRadarPanels({
  radars,
}: {
  radars: Array<FantasyFreeAgentRadar | null>;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Free-agent trends
          </h2>
          <p className="mt-1 text-sm text-slate-500">League-specific upward performance signals.</p>
        </div>
        <Link href="/watchlist" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Open radar & watchlist →
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {radars.map((radar, index) => (
          <HomeRadarCard
            key={radar?.league.slug ?? index}
            radar={radar}
            fallbackLeague={index === 0 ? "ldl" : "bdb"}
          />
        ))}
      </div>
    </section>
  );
}

function HomeRadarCard({
  radar,
  fallbackLeague,
}: {
  radar: FantasyFreeAgentRadar | null;
  fallbackLeague: "ldl" | "bdb";
}) {
  const league = (radar?.league.slug === "bdb" ? "bdb" : fallbackLeague) as "ldl" | "bdb";
  const leagueName = radar?.league.name ?? (fallbackLeague === "ldl" ? "LDL" : "BδB");
  const leaders = radar?.players.filter((player) => player.trend_rank != null).slice(0, 3) ?? [];
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <h3 className="font-black text-slate-950 dark:text-white">
            {leagueName} radar
          </h3>
          <p className="text-xs text-slate-500">{radar?.categories.length ?? "—"} categories · last 7 days</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Free agents
        </span>
      </div>
      {leaders.length ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {leaders.map((player) => {
            const src = photoUrl(player.photo, player.nba_id);
            const href = player.player_id
              ? `/players/${player.player_id}?league=${league}&from=home`
              : `/watchlist?league=${league}`;
            return (
              <Link
                key={player.nba_id}
                href={href}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                {src ? (
                  <img src={src} alt="" className="h-9 w-9 rounded-full bg-slate-100 object-cover dark:bg-slate-800" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400 dark:bg-slate-800">
                    {player.name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    #{player.trend_rank} {player.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {player.trend_strengths.join(" · ") || "Recent upward movement"}
                  </p>
                </div>
                <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {player.trend_score != null && player.trend_score > 0 ? "+" : ""}{player.trend_score}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No qualifying recent games
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Expected during the offseason. Radar will populate automatically when games resume.
          </p>
        </div>
      )}
    </article>
  );
}

type PersonalTeamDashboard = {
  league: "ldl" | "bdb";
  leagueName: string;
  teamName: string;
  teamId: string;
  matchup: FantasyMatchupPeriod | null;
  performance: FantasyRosterPerformance | null;
  profile: FantasyTeamCategoryProfile | null;
};

function PersonalTeamsGrid({
  teams,
  hasAccessIdentity,
  hasSession,
}: {
  teams: PersonalTeamDashboard[];
  hasAccessIdentity: boolean;
  hasSession: boolean;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          My teams
        </h2>
        <p className="text-xs text-slate-400">Status, best move and quick actions</p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        {teams.map((team) => (
          <PersonalTeamCard key={team.league} dashboard={team} />
        ))}
        {teams.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="font-bold text-slate-900 dark:text-white">
              {hasSession
                ? "No active fantasy memberships"
                : hasAccessIdentity
                  ? "Fantasy session unavailable"
                  : "Personal features unavailable in this preview"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasSession
                ? "Your account is signed in, but no league team is currently assigned."
                : hasAccessIdentity
                  ? "Cloudflare Access recognized you, but the fantasy identity service could not load your account."
                  : "Use the protected production domain to sign in and load your teams and personal tools."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function PersonalTeamCard({ dashboard }: { dashboard: PersonalTeamDashboard }) {
  const { league, matchup, performance } = dashboard;
  const leagueName = performance?.league.name ?? matchup?.league.name ?? dashboard.leagueName;
  const teamName = performance?.team.name ?? dashboard.teamName;
  const teamId = dashboard.teamId;
  const rosterHref = `/fantasy/${league}/roster/${encodeURIComponent(teamId)}`;
  const tradeHref = `/fantasy/${league}/roster/${encodeURIComponent(teamId)}/trade`;
  const analysisHref = `${rosterHref}#team-analysis`;

  const currentPayroll = performance?.payroll?.seasons[0];
  const injured = performance?.players.filter((player) => player.injury) ?? [];
  const capPosition = currentPayroll?.remaining;
  const claimBudget = performance?.team.claim_budget?.remaining;
  const rosterCount = performance?.players.length;
  const rosterMinimum = performance?.league.roster_rules?.minimum_players;
  const rosterIncomplete = rosterCount != null && rosterMinimum != null && rosterCount < rosterMinimum;
  const rosterShortfall = rosterIncomplete ? rosterMinimum - rosterCount : null;
  const resourceLabel = claimBudget != null ? "UFA tokens" : "Cap position";
  const resourceValue = claimBudget != null
    ? String(claimBudget)
    : capPosition == null
      ? "Unavailable"
      : capPosition < 0
        ? `${compactMoney(Math.abs(capPosition))} over`
        : `${compactMoney(capPosition)} under`;
  const resourceTone = claimBudget != null || (capPosition != null && capPosition >= 0)
    ? "text-emerald-600 dark:text-emerald-400"
    : capPosition != null
      ? "text-red-600 dark:text-red-400"
      : "text-slate-500";

  return (
    <article className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm dark:border-blue-900 dark:from-blue-950/60 dark:via-slate-900 dark:to-indigo-950/50">
      <div className="flex items-start justify-between gap-3 border-b border-blue-100 px-5 py-4 dark:border-blue-900/70">
        <div>
          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            {leagueName}
          </span>
          <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{teamName}</h3>
        </div>
        {rosterIncomplete && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Roster incomplete
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-blue-100 border-b border-blue-100 bg-white/60 dark:divide-blue-900/70 dark:border-blue-900/70 dark:bg-slate-950/20">
        <div className="min-w-0 px-2 py-4 min-[360px]:px-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Roster</p>
          <p className={`mt-1 truncate text-sm font-black tabular-nums ${rosterIncomplete ? "text-amber-700 dark:text-amber-300" : "text-slate-950 dark:text-white"}`}>
            {rosterCount == null ? "Unavailable" : `${rosterCount} players`}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {rosterIncomplete
              ? `${rosterShortfall} below minimum`
              : rosterCount == null
                ? "Data unavailable"
                : rosterMinimum == null
                  ? "Minimum unavailable"
                  : `Minimum ${rosterMinimum}`}
          </p>
        </div>
        <div className="min-w-0 px-2 py-4 min-[360px]:px-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{resourceLabel}</p>
          <p className={`mt-1 truncate text-xs font-black tabular-nums ${resourceTone}`}>
            {resourceValue}
          </p>
        </div>
        <div className="min-w-0 px-2 py-4 min-[360px]:px-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Injuries</p>
          <p className={`mt-1 text-base font-black ${injured.length ? "text-red-600 dark:text-red-400" : "text-slate-950 dark:text-white"}`}>
            {performance ? injured.length : "—"}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {injured.map((player) => player.short_name).join(", ") || (performance ? "No alerts" : "Unavailable")}
          </p>
        </div>
      </div>

      {dashboard.profile && (
        <div className="border-b border-blue-100 bg-white/80 px-5 py-4 dark:border-blue-900/70 dark:bg-slate-950/30">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Category outlook
            </p>
            <Link
              href={analysisHref}
              className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Full analysis →
            </Link>
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <HomeProfileLine
              label="Strengths"
              values={dashboard.profile.strengths}
              tone="strength"
              empty="No top-third categories"
            />
            <HomeProfileLine
              label="Weaknesses"
              values={dashboard.profile.weaknesses}
              tone="weakness"
              empty="No bottom-third categories"
            />
          </div>
        </div>
      )}

      <div className="border-b border-blue-100 bg-white/70 px-4 py-4 dark:border-blue-900/70 dark:bg-slate-950/20">
        <ManagerTodayRecommendation
          league={league}
          teamId={teamId}
          provisional={rosterIncomplete}
        />
      </div>

      <div className="p-4">
        {matchup ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{matchup.period.caption}</p>
              <p className="truncate text-[11px] text-slate-500">{matchup.period.date_range}</p>
            </div>
            <div className="space-y-3">
              {matchup.matchups.map((item) => (
                <PersonalMatchupCard
                  key={item.matchup_id}
                  matchup={item}
                  personalTeamId={matchup.team_id}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Current matchup is temporarily unavailable.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-blue-100 bg-white/70 p-4 dark:border-blue-900/70 dark:bg-slate-950/20 sm:grid-cols-4">
        <QuickAction href={rosterHref} label="Roster" />
        <QuickAction href={`/watchlist?league=${league}`} label="Free agents" />
        <QuickAction href={tradeHref} label="Analyze trade" />
        <QuickAction href={`/draft-assets?league=${league}`} label="Draft assets" />
      </div>
    </article>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-center text-xs font-bold text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950"
    >
      {label}
    </Link>
  );
}

function HomeProfileLine({
  label,
  values,
  tone,
  empty,
}: {
  label: string;
  values: string[];
  tone: "strength" | "weakness";
  empty: string;
}) {
  const color =
    tone === "strength"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-700 dark:text-rose-400";
  const visible = values.slice(0, 3);
  const remaining = Math.max(values.length - visible.length, 0);
  const summary = remaining
    ? `${visible.join(" · ")} · +${remaining} more`
    : visible.join(" · ");
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate text-xs font-bold ${values.length ? color : "text-slate-400"}`}>
        {summary || empty}
      </p>
    </div>
  );
}

function compactMoney(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

function PersonalMatchupCard({
  matchup,
  personalTeamId,
}: {
  matchup: FantasyMatchup;
  personalTeamId: string;
}) {
  const isAway = matchup.away_team.id === personalTeamId;
  const myTeam = isAway ? matchup.away_team : matchup.home_team;
  const opponent = isAway ? matchup.home_team : matchup.away_team;
  const myRecord = isAway ? matchup.away_record : matchup.home_record;
  const recordTotal = myRecord?.reduce((total, value) => total + value, 0) ?? 0;
  const scheduled = recordTotal === 0;

  return (
    <article className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
      <div className="flex items-center justify-between gap-3">
        <TeamIdentity team={myTeam} align="left" />
        <div className="shrink-0 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {scheduled ? "Scheduled" : "Categories"}
          </p>
          <p className="mt-1 text-lg font-black tabular-nums text-slate-900 dark:text-white">
            {scheduled || !myRecord ? "vs" : `${myRecord[0]}-${myRecord[1]}-${myRecord[2]}`}
          </p>
        </div>
        <TeamIdentity team={opponent} align="right" />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
        {matchup.categories.map((category) => {
          const mine = isAway ? category.away_result_points : category.home_result_points;
          const theirs = isAway ? category.home_result_points : category.away_result_points;
          const winning = !scheduled && mine !== null && theirs !== null && mine > theirs;
          const losing = !scheduled && mine !== null && theirs !== null && mine < theirs;
          return (
            <span
              key={category.id}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                winning
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : losing
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {category.short_name}
            </span>
          );
        })}
      </div>
    </article>
  );
}

function TeamIdentity({
  team,
  align,
}: {
  team: { name: string; logoUrl128?: string | null };
  align: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {team.logoUrl128 ? (
          <Image src={team.logoUrl128} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">
            {team.name.charAt(0)}
          </div>
        )}
      </div>
      <p className="truncate text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">
        {team.name}
      </p>
    </div>
  );
}

function TeamScore({ team, showScore }: { team: { name: string; short: string; logo: string | null; score: string | null; winner: boolean }; showScore: boolean }) {
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

function formatGameDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => (
    parts.find((item) => item.type === type)?.value ?? ""
  );

  return `${part("weekday")} ${part("day")} ${part("month")} · ${part("hour")}:${part("minute")}`;
}

function greetingForAthens(): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
