import WatchlistRadar from "@/components/WatchlistRadar";
import {
  fetchFantasyWatchlist,
  fetchFreeAgentRadar,
} from "@/lib/api";
import { parseLeagueSlug } from "@/lib/leagues";

type PageSearchParams = Promise<{ league?: string }>;

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const league = parseLeagueSlug(params.league);
  const [radar, watchlist] = await Promise.all([
    fetchFreeAgentRadar(league).catch(() => null),
    fetchFantasyWatchlist(league).catch(() => null),
  ]);

  return (
    <WatchlistRadar
      key={league}
      initialLeague={league}
      initialRadar={radar}
      initialWatchlist={watchlist}
    />
  );
}
