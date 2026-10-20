import Image from "next/image";
import Link from "next/link";
import { Suspense, cache } from "react";
import {
  fetchScoreboard,
  fetchNbaHotFive,
  fetchNews,
  fetchFantasyStandings,
  fetchFantasyMatchupsForTeam,
  fetchFantasyRoster,
  fetchFantasyRosterPerformance,
  fetchFantasyTeamCategoryProfile,
  fetchFantasyTeamPowerOutlook,
  fetchFantasyCategoryTargets,
  fetchFantasyLeagues,
  fetchFreeAgentRadar,
  photoUrl,
  type FantasyFreeAgentRadar,
  type FantasyMatchup,
  type FantasyMatchupPeriod,
  type FantasyRosterPerformance,
  type FantasyRoster,
  type FantasyTeam,
  type FantasyTeamCategoryProfile,
  type FantasyTeamPowerOutlook,
  type FantasyCategoryTargets,
  type Game,
} from "@/lib/api";
import HomeLeagueStandings from "@/components/HomeLeagueStandings";
import ManagerTodayRecommendation from "@/components/ManagerTodayRecommendation";
import { loadCurrentFantasyContext } from "@/lib/fantasySessionServer";
import type { FantasyMembership } from "@/lib/fantasySessionTypes";
import HomeScoreboard, { type ScoreboardItem } from "@/components/HomeScoreboard";
import HomeHotFive from "@/components/HomeHotFive";
import HomeCategoryOutlook from "@/components/HomeCategoryOutlook";
import GnfcPowerSummary from "@/components/GnfcPowerSummary";
import { gnfcFaMarketSummary } from "@/lib/gnfcFaMarketSummary";
import { buildHomeAttentionItems, type HomeAttentionItem, type HomeAttentionTeam } from "@/lib/homeAttention";
import { ownedPlayersByTeam, ownedPlayersForGame } from "@/lib/scoreboardOwnership";
import { isLeagueSlug, leagueLabel, LEAGUE_SLUGS, type LeagueSlug } from "@/lib/leagues";

type StandingsLeague = LeagueSlug | "gnfc";
type LeagueStandingsPanel = { league: StandingsLeague; teams: FantasyTeam[]; loadFailed: boolean };
type LeagueRadarPanel = { league: LeagueSlug; radar: FantasyFreeAgentRadar | null };

export const dynamic = "force-dynamic";

const loadHomePersonal = cache(async () => {
  const context = await loadCurrentFantasyContext().catch(() => ({
    identity: null,
    identityHeaders: null,
    session: null,
  }));
  const session = context.session;
  const teams = await Promise.all(
    (session?.memberships ?? [])
      .filter((membership): membership is FantasyMembership & {
        league_slug: LeagueSlug;
        fantrax_team_id: string;
      } => isLeagueSlug(membership.league_slug) && Boolean(membership.fantrax_team_id))
      .map(async (membership) => {
        const slug = membership.league_slug;
        const teamId = membership.fantrax_team_id;
        const [matchup, performance, profile] = await Promise.all([
          fetchFantasyMatchupsForTeam(slug, teamId).catch(() => null),
          fetchFantasyRosterPerformance(slug, teamId).catch(() => null),
          fetchFantasyTeamCategoryProfile(slug, teamId).catch(() => null),
        ]);
        return {
          league: slug,
          leagueName: leagueLabel(slug),
          teamName: membership.franchise_name,
          teamId,
          matchup,
          performance,
          profile,
        };
      }),
  ).catch(() => []);
  return { context, teams };
});

const loadGnfcHomeRoster = cache(async (teamId: string) =>
  fetchFantasyRoster("gnfc", teamId).catch(() => null),
);

export default function Home() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-8 px-4 py-8 xl:max-w-7xl 2xl:max-w-[1500px]">
      <Suspense fallback={<PersonalHomeFallback />}>
        <PersonalHome />
      </Suspense>

      <Suspense fallback={<HomeSectionFallback title="NBA Scoreboard" />}>
        <ScoreboardHome />
      </Suspense>

      <Suspense fallback={<HomeSectionFallback title="Hot 5" />}>
        <HotFiveHome />
      </Suspense>

      <Suspense fallback={<HomeSectionFallback title="Free-agent trends" />}>
        <RadarHome />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<HomeSectionFallback title="Fantasy standings" />}>
          <StandingsHome />
        </Suspense>
        <Suspense fallback={<HomeSectionFallback title="NBA News" />}>
          <NewsHome />
        </Suspense>
      </div>
    </main>
  );
}

async function PersonalHome() {
  const { context, teams } = await loadHomePersonal();
  const session = context.session;
  const gnfcMembership = session?.memberships.find((membership) => membership.league_slug === "gnfc") ?? null;

  return (
    <>
      <ManagerTodayHeader
        displayName={session?.user.display_name ?? null}
        teamCount={teams.length + (gnfcMembership ? 1 : 0)}
      />
      <Suspense fallback={<HomeSectionFallback title="Needs attention" />}>
        <NeedsAttentionWithGnfc teams={teams} gnfcMembership={gnfcMembership} />
      </Suspense>
      <PersonalTeamsGrid
        teams={teams}
        gnfcMembership={gnfcMembership}
        identityHeaders={context.identityHeaders}
        hasAccessIdentity={Boolean(context.identity)}
        hasSession={Boolean(session)}
      />
    </>
  );
}

async function ScoreboardHome() {
  const personalPromise = loadHomePersonal();
  const games = await fetchScoreboard();
  return (
    <Suspense fallback={<ScoreboardGames games={games} />}>
      <PersonalScoreboardGames games={games} personalPromise={personalPromise} />
    </Suspense>
  );
}

async function PersonalScoreboardGames({ games, personalPromise }: {
  games: Game[];
  personalPromise: ReturnType<typeof loadHomePersonal>;
}) {
  const { teams, context } = await personalPromise;
  const gnfcTeamId = context.session?.memberships.find((membership) => membership.league_slug === "gnfc")?.fantrax_team_id;
  const gnfcRoster = gnfcTeamId ? await loadGnfcHomeRoster(gnfcTeamId) : null;

  const ownedByTeam = ownedPlayersByTeam([
    ...teams,
    ...(gnfcRoster ? [{ league: "gnfc" as const, leagueName: "GNFC Γ5", performance: { players: gnfcRoster.players } }] : []),
  ]);
  return <ScoreboardGames games={games} ownedByTeam={ownedByTeam} />;
}

function ScoreboardGames({ games, ownedByTeam }: {
  games: Game[];
  ownedByTeam?: ReturnType<typeof ownedPlayersByTeam>;
}) {
  const scoreboardItems: ScoreboardItem[] = games.map((g) => {
    const isLive = !g.completed && g.status !== "Scheduled";
    return {
      id: g.id,
      away: g.away,
      home: g.home,
      completed: g.completed,
      showScore: g.completed || isLive,
      displayStatus: g.completed || isLive ? g.status : formatGameDate(g.date) ?? g.status,
      ownedPlayers: ownedByTeam ? ownedPlayersForGame(ownedByTeam, g) : [],
      expiresAt: g.expires_at ?? null,
    };
  });

  // Preseason games remain visible; scoreboard data does not feed the fantasy model.
  return (
    <HomeScoreboard
      items={scoreboardItems}
      slateDate={games.find((game) => !game.expires_at)?.date ?? null}
      previousSlateDate={games.find((game) => game.expires_at)?.date ?? null}
    />
  );
}

async function HotFiveHome() {
  const data = await fetchNbaHotFive().catch(() => null);
  return <HomeHotFive data={data} />;
}

async function RadarHome() {
  const radars = await Promise.all(LEAGUE_SLUGS.map(async (league): Promise<LeagueRadarPanel> => ({
    league,
    radar: await fetchFreeAgentRadar(league).catch(() => null),
  })));
  return <HomeRadarPanels radars={radars} />;
}

async function StandingsHome() {
  const standings = await Promise.all(([...LEAGUE_SLUGS, "gnfc"] as const).map(async (league): Promise<LeagueStandingsPanel> => {
    try {
      return { league, teams: await fetchFantasyStandings(league), loadFailed: false };
    } catch {
      return { league, teams: [], loadFailed: true };
    }
  }));
  return <HomeLeagueStandings standings={standings} />;
}

async function NewsHome() {
  const news = await fetchNews(6);
  return (
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
  );
}

function HomeSectionFallback({ title }: { title: string }) {
  return (
    <section aria-label={`${title} loading`} className="animate-pulse">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{title}</h2>
      <div className="h-32 rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
    </section>
  );
}

function PersonalHomeFallback() {
  return (
    <div aria-label="Your teams loading" className="space-y-8 animate-pulse">
      <div className="flex h-36 items-center rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 text-sm font-semibold text-blue-100">
        Loading your teams…
      </div>
      <HomeSectionFallback title="Needs attention" />
      <HomeSectionFallback title="My teams" />
    </div>
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

async function NeedsAttentionWithGnfc({
  teams,
  gnfcMembership,
}: {
  teams: PersonalTeamDashboard[];
  gnfcMembership: FantasyMembership | null;
}) {
  const gnfcTeamId = gnfcMembership?.fantrax_team_id;
  const gnfcRoster = gnfcTeamId ? await loadGnfcHomeRoster(gnfcTeamId) : null;
  const attentionTeams: HomeAttentionTeam[] = teams.map((dashboard) => ({
    league: dashboard.league,
    teamId: dashboard.teamId,
    teamName: dashboard.performance?.team.name ?? dashboard.teamName,
    rosterCount: dashboard.performance?.players.length ?? null,
    rosterMinimum: dashboard.performance?.league.roster_rules?.minimum_players ?? null,
    capRemaining: dashboard.performance?.payroll?.seasons[0]?.remaining ?? null,
    injuredPlayerNames: dashboard.performance?.players.filter((player) => player.injury).map((player) => player.short_name) ?? [],
  }));
  if (gnfcTeamId && gnfcRoster) {
    attentionTeams.push({
      league: "gnfc",
      teamId: gnfcTeamId,
      teamName: gnfcRoster.team_name,
      rosterCount: gnfcRoster.players.length,
      rosterMinimum: null,
      capRemaining: null,
      injuredPlayerNames: gnfcRoster.players.filter((player) => player.injury).map((player) => player.short_name),
    });
  }

  const items = buildHomeAttentionItems(attentionTeams);
  const priorityItems = items.filter((item) => item.kind !== "injury");
  const injuryItems = items.filter((item): item is Extract<HomeAttentionItem, { kind: "injury" }> => item.kind === "injury");
  if (teams.length === 0 && !gnfcMembership) return null;

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
        <div className="space-y-3">
          {priorityItems.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {priorityItems.map((item) => (
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
          )}
          {injuryItems.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label="Injury alerts by league">
              {injuryItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-label={`${item.title}: ${item.detail}`}
                  title={`${item.title}: ${item.detail}`}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
                >
                  <span className="shrink-0 rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-black uppercase dark:bg-amber-900/70">
                    {item.league === "gnfc" ? "GNFC Γ5" : leagueLabel(item.league)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{item.detail}</span>
                  <span className="shrink-0 text-[10px] font-bold">{item.injuryCount} {item.injuryCount === 1 ? "alert" : "alerts"}</span>
                </Link>
              ))}
            </div>
          )}
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
  radars: LeagueRadarPanel[];
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
        {radars.map(({ league, radar }) => (
          <HomeRadarCard
            key={league}
            radar={radar}
            league={league}
          />
        ))}
      </div>
    </section>
  );
}

function HomeRadarCard({
  radar,
  league,
}: {
  radar: FantasyFreeAgentRadar | null;
  league: LeagueSlug;
}) {
  const leagueName = radar?.league.name ?? leagueLabel(league);
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
  league: LeagueSlug;
  leagueName: string;
  teamName: string;
  teamId: string;
  matchup: FantasyMatchupPeriod | null;
  performance: FantasyRosterPerformance | null;
  profile: FantasyTeamCategoryProfile | null;
};

function PersonalTeamsGrid({
  teams,
  gnfcMembership,
  identityHeaders,
  hasAccessIdentity,
  hasSession,
}: {
  teams: PersonalTeamDashboard[];
  gnfcMembership: FantasyMembership | null;
  identityHeaders: Headers | null;
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
      <div className={`grid items-start gap-5 lg:grid-cols-2 ${teams.length + Number(Boolean(gnfcMembership)) >= 3 ? "2xl:grid-cols-3" : ""}`}>
        {teams.map((team) => (
          <PersonalTeamCard key={team.league} dashboard={team} />
        ))}
        {gnfcMembership && (
          <Suspense fallback={<HomeSectionFallback title="GNFC Γ5" />}>
            <GnfcHomeCardWithRoster membership={gnfcMembership} identityHeaders={identityHeaders} />
          </Suspense>
        )}
        {teams.length === 0 && !gnfcMembership && (
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

async function GnfcHomeCardWithRoster({ membership, identityHeaders }: { membership: FantasyMembership; identityHeaders: Headers | null }) {
  const teamId = membership.fantrax_team_id;
  const [roster, matchup, outlook, profile, leagues] = await Promise.all([
    teamId ? loadGnfcHomeRoster(teamId) : Promise.resolve(null),
    teamId ? fetchFantasyMatchupsForTeam("gnfc", teamId).catch(() => null) : Promise.resolve(null),
    fetchFantasyTeamPowerOutlook("gnfc").catch(() => null),
    teamId ? fetchFantasyTeamCategoryProfile("gnfc", teamId).catch(() => null) : Promise.resolve(null),
    fetchFantasyLeagues().catch(() => []),
  ]);
  const availabilityReady = leagues.find((league) => league.slug === "gnfc")?.availability_ready ?? false;
  const targets = teamId && identityHeaders && availabilityReady
    ? await fetchFantasyCategoryTargets("gnfc", teamId, { availability: "free_agent", limit: 1, actionScope: "all" }, identityHeaders).catch(() => null)
    : null;
  return <GnfcHomeCard membership={membership} roster={roster} matchup={matchup} outlook={outlook} profile={profile} targets={targets} availabilityReady={availabilityReady} />;
}

function GnfcHomeCard({
  membership,
  roster,
  matchup,
  outlook,
  profile,
  targets,
  availabilityReady,
}: {
  membership: FantasyMembership;
  roster: FantasyRoster | null;
  matchup: FantasyMatchupPeriod | null;
  outlook: FantasyTeamPowerOutlook | null;
  profile: FantasyTeamCategoryProfile | null;
  targets: FantasyCategoryTargets | null;
  availabilityReady: boolean;
}) {
  const teamId = membership.fantrax_team_id;
  const rosterHref = teamId ? `/fantasy/gnfc/roster/${encodeURIComponent(teamId)}` : "/fantasy/gnfc";
  const injuries = roster?.players.filter((player) => player.injury) ?? [];
  return (
    <article className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm dark:border-blue-900 dark:from-blue-950/60 dark:via-slate-900 dark:to-indigo-950/50">
      <div className="border-b border-blue-100 px-5 py-4 dark:border-blue-900/70">
        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          GNFC Γ5
        </span>
        <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{roster?.team_name ?? membership.franchise_name}</h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Shared team with a separate membership for each manager</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-blue-100 border-b border-blue-100 bg-white/60 dark:divide-blue-900/70 dark:border-blue-900/70 dark:bg-slate-950/20">
        <div className="px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Roster</p>
          <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{roster ? `${roster.players.length} players` : "Unavailable"}</p>
          <p className="text-[11px] text-slate-500">Fantrax roster</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Injuries</p>
          <p className={`mt-1 text-sm font-black ${injuries.length ? "text-red-600 dark:text-red-400" : "text-slate-950 dark:text-white"}`}>{roster ? injuries.length : "—"}</p>
          <p className="truncate text-[11px] text-slate-500">{roster ? (injuries.map((player) => player.short_name).join(", ") || "No alerts") : "Roster unavailable"}</p>
        </div>
      </div>
      <MobileTeamOutlook profile={profile} analysisHref={`${rosterHref}#team-analysis`} />
      <div className="hidden lg:block">
        <HomeCategoryOutlook
          analysisHref={`${rosterHref}#team-analysis`}
          profile={profile}
          profileContext="historical profile"
          summary={<GnfcPowerSummary outlook={outlook} teamId={teamId ?? ""} />}
        />
      </div>
      <div className="border-b border-blue-100 px-4 py-4 dark:border-blue-900/70">
        <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-950/20">
          <p className="font-bold uppercase tracking-wide text-slate-500">Free-agent move check</p>
          <p className="mt-1 font-bold text-slate-900 dark:text-white">
            {targets
              ? gnfcFaMarketSummary(targets)
              : availabilityReady ? "Free-agent analysis is temporarily unavailable" : "Free-agent analysis is not active yet"}
          </p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Historical category fit is not a pickup recommendation. Check role, availability and the roster slot before claiming.</p>
          {availabilityReady && <Link href={`${rosterHref}#player-targets`} className="mt-2 inline-block font-bold text-blue-600 hover:underline dark:text-blue-400">Review FA analysis →</Link>}
        </div>
      </div>
      <div className="hidden lg:block">
        <div className="px-4 py-4">
          {matchup ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{matchup.period.caption}</p>
                <p className="truncate text-[11px] text-slate-500">{matchup.period.date_range}</p>
              </div>
              <div className="space-y-3">
                {matchup.matchups.map((item) => (
                  <PersonalMatchupCard key={item.matchup_id} matchup={item} personalTeamId={matchup.team_id} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Current matchup is not available yet.</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-blue-100 bg-white/70 p-4 dark:border-blue-900/70 dark:bg-slate-950/20">
        <QuickAction href={rosterHref} label="Roster" />
        <QuickAction href="/fantasy/gnfc" label="Standings" />
      </div>
    </article>
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
  const franchisePlayer = league === "ldl"
    ? performance?.players.find((player) => player.tenure?.franchise_player)
    : null;
  const capPosition = currentPayroll?.remaining;
  const claimBudget = performance?.team.claim_budget?.remaining;
  const rosterCount = performance?.players.length;
  const rosterMinimum = performance?.league.roster_rules?.minimum_players;
  const rosterIncomplete = rosterCount != null && rosterMinimum != null && rosterCount < rosterMinimum;
  const rosterShortfall = rosterIncomplete ? rosterMinimum - rosterCount : null;
  const capValue = capPosition == null
    ? "Unavailable"
    : capPosition < 0
      ? `${compactMoney(Math.abs(capPosition))} over`
      : `${compactMoney(capPosition)} under`;
  const capTone = capPosition != null && capPosition >= 0
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
          {franchisePlayer && (
            <p className="mt-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              Franchise player: {franchisePlayer.name}
            </p>
          )}
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
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cap position</p>
          <p className={`mt-1 text-xs font-black tabular-nums ${capTone}`}>{capValue}</p>
          {league === "bdb" && (
            <div className="mt-2 border-t border-blue-100 pt-2 dark:border-blue-900/70">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">UFA tokens</p>
              <p className="mt-1 text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {claimBudget == null ? "Unavailable" : claimBudget}
              </p>
            </div>
          )}
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

      <MobileTeamOutlook profile={dashboard.profile} analysisHref={analysisHref} />
      <div className="hidden lg:block">
        {dashboard.profile && (
          <HomeCategoryOutlook
            analysisHref={analysisHref}
            profile={dashboard.profile}
            summary={
              <Suspense fallback={<p className="mt-3 text-xs text-slate-500">Loading roster comparison…</p>}>
                <HomeTeamPowerSummaryAsync teamId={teamId} league={league} />
              </Suspense>
            }
          />
        )}
      </div>

      <div className="border-b border-blue-100 bg-white/70 px-4 py-4 dark:border-blue-900/70 dark:bg-slate-950/20">
        <ManagerTodayRecommendation
          league={league}
          teamId={teamId}
          provisional={rosterIncomplete}
        />
      </div>

      <div className="hidden lg:block">
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

function MobileTeamOutlook({ profile, analysisHref }: {
  profile: FantasyTeamCategoryProfile | null;
  analysisHref: string;
}) {
  return (
    <div className="border-b border-blue-100 bg-white/70 px-4 py-3 text-xs dark:border-blue-900/70 dark:bg-slate-950/20 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold uppercase tracking-wide text-slate-500">Category outlook</p>
        <Link href={analysisHref} className="shrink-0 font-bold text-blue-600 dark:text-blue-400">Full analysis →</Link>
      </div>
      {profile?.sample.players_included ? (
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Strengths: {profile.strengths.slice(0, 2).join(" · ") || "—"} · Gaps: {profile.weaknesses.slice(0, 2).join(" · ") || "—"}
        </p>
      ) : (
        <p className="mt-1 text-slate-500">Category details are available on the team page.</p>
      )}
    </div>
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

async function HomeTeamPowerSummaryAsync({ teamId, league }: { teamId: string; league: LeagueSlug }) {
  const outlook = await fetchFantasyTeamPowerOutlook(league).catch(() => null);
  return <HomeTeamPowerSummary outlook={outlook} teamId={teamId} league={league} />;
}

function HomeTeamPowerSummary({
  outlook,
  teamId,
  league,
}: {
  outlook: FantasyTeamPowerOutlook | null;
  teamId: string;
  league: LeagueSlug;
}) {
  if (!outlook || outlook.status !== "ready") return null;
  const row = outlook.teams.find((item) => item.team.id === teamId);
  if (!row) return null;
  const tier = row.tier === "top_third"
    ? "top third"
    : row.tier === "bottom_third"
      ? "bottom third"
      : "middle third";

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 text-xs dark:border-indigo-800 dark:bg-indigo-950/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-indigo-950 dark:text-indigo-100">
          Provisional roster strength · {row.rank == null ? "not ranked" : `#${row.rank} of ${outlook.teams_found} · ${tier}`}
        </p>
        <Link href={`/power-ranking#${league}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
          League comparison →
        </Link>
      </div>
      {row.rank != null && (
        <ul className="mt-2 space-y-1 text-slate-700 dark:text-slate-300">
          <li>• Strongest relative categories: {row.strengths.join(" · ") || "none in the top third"}.</li>
          <li>• Main gaps: {row.weaknesses.join(" · ") || "none in the bottom third"}.</li>
        </ul>
      )}
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Current roster · {outlook.stats_season} historical stats · not a final-standings forecast
        {row.players_missing_stats > 0 ? ` · ${row.players_missing_stats} without stats` : ""}
        {outlook.snapshot?.captured_at ? ` · roster sync ${outlook.snapshot.captured_at.slice(0, 10)}` : ""}
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
