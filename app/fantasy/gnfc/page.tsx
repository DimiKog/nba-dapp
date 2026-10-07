import FantasyLeagueStandings from "@/components/FantasyLeagueStandings";
import GnfcAvailabilityNotice from "@/components/GnfcAvailabilityNotice";
import { fetchFantasyLeagues, fetchFantasyStandings } from "@/lib/api";
import { loadCurrentFantasySession, membershipFor } from "@/lib/fantasySessionServer";

export const dynamic = "force-dynamic";

export default async function GnfcPage() {
  let teams;
  try {
    teams = await fetchFantasyStandings("gnfc");
  } catch {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">GNFC Γ5</h1>
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          Could not load the league standings right now. Try again shortly.
        </p>
      </main>
    );
  }

  const [leagues, session] = await Promise.all([
    fetchFantasyLeagues().catch(() => []),
    loadCurrentFantasySession().catch(() => null),
  ]);
  const config = leagues.find((league) => league.slug === "gnfc");
  const membership = membershipFor(session, "gnfc");

  return (
    <FantasyLeagueStandings
      active="gnfc"
      teams={teams}
      showMyTeamLink={Boolean(membership?.fantrax_team_id)}
      intro={
        <GnfcAvailabilityNotice
          joinedTeams={teams.length}
          expectedTeams={config?.expected_team_count ?? 12}
          availabilityReady={config?.availability_ready ?? false}
        />
      }
    />
  );
}
