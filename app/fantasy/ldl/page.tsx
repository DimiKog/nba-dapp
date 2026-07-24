import FantasyLeagueStandings from "@/components/FantasyLeagueStandings";
import { fetchFantasyStandings } from "@/lib/api";

export default async function LDLPage() {
  let teams;
  try {
    teams = await fetchFantasyStandings("ldl");
  } catch {
    return <StandingsError />;
  }
  return <FantasyLeagueStandings active="ldl" teams={teams} />;
}

function StandingsError() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm text-red-500">Could not load LDL standings. Check backend connection.</p>
    </main>
  );
}
