import FantasyLeagueStandings from "@/components/FantasyLeagueStandings";
import { fetchFantasyStandings } from "@/lib/api";

export default async function BDBPage() {
  let teams;
  try {
    teams = await fetchFantasyStandings("bdb");
  } catch {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-red-500">
          Could not load BδB standings. The backend league configuration may still need activation.
        </p>
      </main>
    );
  }
  return <FantasyLeagueStandings active="bdb" teams={teams} />;
}
