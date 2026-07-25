import Image from "next/image";
import Link from "next/link";
import {
  fetchScoreboard,
  fetchNews,
  fetchFantasyStandings,
  fetchFantasyLeagues,
  fetchPersonalFantasyMatchups,
  fetchPersonalFantasyPerformance,
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

export default async function Home() {
  const [games, news, ldlTeams, bdbTeams, personalTeams, radarPanels] = await Promise.all([
    fetchScoreboard(),
    fetchNews(6),
    fetchFantasyStandings("ldl").catch(() => []),
    fetchFantasyStandings("bdb").catch(() => []),
    fetchFantasyLeagues()
      .then((leagues) => Promise.all(
        leagues
          .filter((league) => league.enabled && league.personal_team_id)
          .map(async (league) => {
            const slug = league.slug as "ldl" | "bdb";
            const [matchup, performance, profile] = await Promise.all([
              fetchPersonalFantasyMatchups(league.slug).catch(() => null),
              fetchPersonalFantasyPerformance(league.slug).catch(() => null),
              fetchFantasyTeamCategoryProfile(slug, league.personal_team_id!).catch(() => null),
            ]);
            return {
              league: league.slug,
              leagueName: league.name,
              teamName: league.personal_team_name,
              matchup,
              performance,
              profile,
            };
          }),
      ))
      .catch(() => []),
    Promise.all([
      fetchFreeAgentRadar("ldl").catch(() => null),
      fetchFreeAgentRadar("bdb").catch(() => null),
    ]),
  ]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-8 px-4 py-8">

      {/* Scoreboard */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          NBA Scoreboard
        </h2>
        {games.length === 0 ? (
          <p className="text-sm text-slate-400">No games today.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {games.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm min-w-[220px]">
                <TeamScore team={g.away} />
                <span className="text-xs text-slate-400 font-medium">@</span>
                <TeamScore team={g.home} />
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${g.completed ? "bg-slate-100 dark:bg-slate-800 text-slate-500" : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"}`}>
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <PersonalTeamsGrid teams={personalTeams} />

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
            fallbackLeague={index === 0 ? "LDL" : "BδB"}
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
  fallbackLeague: string;
}) {
  const leaders = radar?.players.filter((player) => player.trend_rank != null).slice(0, 3) ?? [];
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <h3 className="font-black text-slate-950 dark:text-white">
            {radar?.league.name ?? fallbackLeague} radar
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
            return (
              <div key={player.nba_id} className="flex items-center gap-3 px-4 py-3">
                {src ? (
                  <img src={src} alt="" className="h-9 w-9 rounded-full bg-slate-100 object-cover dark:bg-slate-800" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400 dark:bg-slate-800">
                    {player.name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    #{player.trend_rank} {player.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {player.trend_strengths.join(" · ") || "Recent upward movement"}
                  </p>
                </div>
                <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {player.trend_score != null && player.trend_score > 0 ? "+" : ""}{player.trend_score}
                </p>
              </div>
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
  league: string;
  leagueName: string;
  teamName: string;
  matchup: FantasyMatchupPeriod | null;
  performance: FantasyRosterPerformance | null;
  profile: FantasyTeamCategoryProfile | null;
};

function PersonalTeamsGrid({ teams }: { teams: PersonalTeamDashboard[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          My fantasy teams
        </h2>
        <p className="text-xs text-slate-400">Cap, health and current matchups</p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        {teams.map((team) => (
          <PersonalTeamCard key={team.league} dashboard={team} />
        ))}
      </div>
    </section>
  );
}

function PersonalTeamCard({ dashboard }: { dashboard: PersonalTeamDashboard }) {
  const { league, matchup, performance } = dashboard;
  const leagueName = performance?.league.name ?? matchup?.league.name ?? dashboard.leagueName;
  const teamName = performance?.team.name ?? matchup?.league.personal_team_name ?? dashboard.teamName;
  const teamId = performance?.team.id ?? matchup?.team_id;
  const rosterHref = teamId ? `/fantasy/${league}/roster/${teamId}` : `/fantasy/${league}`;
  const analysisHref = `${rosterHref}#team-analysis`;

  if (!performance && !matchup) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
        <span className="rounded-full bg-slate-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          {leagueName}
        </span>
        <p className="mt-3 font-bold text-slate-900 dark:text-white">{teamName}</p>
        <p className="mt-1 text-sm text-slate-500">Personal fantasy data is temporarily unavailable.</p>
      </div>
    );
  }

  const currentPayroll = performance?.payroll?.seasons[0];
  const injured = performance?.players.filter((player) => player.injury) ?? [];
  const leader = [...(performance?.players ?? [])]
    .filter((player) => (player.season_average?.games ?? 0) > 0)
    .sort((a, b) => (b.season_average?.points ?? 0) - (a.season_average?.points ?? 0))[0];

  const capPosition = currentPayroll?.remaining;

  return (
    <article className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm dark:border-blue-900 dark:from-blue-950/60 dark:via-slate-900 dark:to-indigo-950/50">
      <div className="flex items-start justify-between gap-3 border-b border-blue-100 px-5 py-4 dark:border-blue-900/70">
        <div>
          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            {leagueName}
          </span>
          <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{teamName}</h3>
        </div>
        <Link
          href={rosterHref}
          className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Open roster →
        </Link>
      </div>

      <div className="grid grid-cols-3 divide-x divide-blue-100 border-b border-blue-100 bg-white/60 dark:divide-blue-900/70 dark:border-blue-900/70 dark:bg-slate-950/20">
        <div className="min-w-0 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cap position</p>
          <p className={`mt-1 truncate text-base font-black tabular-nums ${
            capPosition == null
              ? "text-slate-500"
              : capPosition < 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
          }`}>
            {capPosition == null
              ? "Unavailable"
              : capPosition < 0
                ? `${compactMoney(Math.abs(capPosition))} over`
                : `${compactMoney(capPosition)} under`}
          </p>
        </div>
        <div className="min-w-0 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Injuries</p>
          <p className={`mt-1 text-base font-black ${injured.length ? "text-red-600 dark:text-red-400" : "text-slate-950 dark:text-white"}`}>
            {performance ? injured.length : "—"}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {injured.map((player) => player.short_name).join(", ") || (performance ? "No alerts" : "Unavailable")}
          </p>
        </div>
        <div className="min-w-0 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Scoring leader</p>
          <p className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">
            {leader?.name ?? "No games yet"}
          </p>
          <p className="truncate text-[11px] font-semibold text-slate-500">
            {leader ? `${leader.season_average?.points ?? 0} PTS` : "—"}
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
    </article>
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
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate text-xs font-bold ${values.length ? color : "text-slate-400"}`}>
        {values.slice(0, 3).join(" · ") || empty}
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
      <p className="line-clamp-2 text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">
        {team.name}
      </p>
    </div>
  );
}

function TeamScore({ team }: { team: { name: string; short: string; logo: string | null; score: string | null; winner: boolean } }) {
  return (
    <div className="flex items-center gap-2">
      {team.logo && <img src={team.logo} alt={team.short} className="h-7 w-7 object-contain" />}
      <div>
        <p className={`text-sm font-bold ${team.winner ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
          {team.short}
        </p>
        <p className={`text-sm tabular-nums ${team.winner ? "font-bold text-slate-900 dark:text-slate-100" : "text-slate-500"}`}>
          {team.score ?? "—"}
        </p>
      </div>
    </div>
  );
}
