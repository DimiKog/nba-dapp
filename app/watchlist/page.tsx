import WatchlistRadar from "@/components/WatchlistRadar";
import { fetchFreeAgentRadar, type FantasyWatchlist } from "@/lib/api";
import { parseLeagueSlug } from "@/lib/leagues";
import { loadCurrentFantasyAccess, membershipFor } from "@/lib/fantasySessionServer";
import { readWatchlist } from "@/lib/watchlistServer";

type PageSearchParams = Promise<{ league?: string }>;

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const league = parseLeagueSlug(params.league);
  const access = await loadCurrentFantasyAccess();
  const membership = membershipFor(access?.session ?? null, league);
  const watchlistPromise = access && membership
    ? readWatchlist(league, access.identityHeaders, 7).then(async (response) => {
        if (!response.ok) throw new Error("Watchlist unavailable");
        return await response.json() as FantasyWatchlist;
      })
    : Promise.resolve(null);
  const [radar, watchlist] = await Promise.all([
    fetchFreeAgentRadar(league).catch(() => null),
    watchlistPromise.catch(() => null),
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
