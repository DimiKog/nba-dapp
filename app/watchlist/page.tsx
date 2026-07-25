import WatchlistRadar from "@/components/WatchlistRadar";
import {
  fetchFantasyWatchlist,
  fetchFreeAgentRadar,
} from "@/lib/api";

export default async function WatchlistPage() {
  const [ldlRadar, ldlWatchlist] = await Promise.all([
    fetchFreeAgentRadar("ldl").catch(() => null),
    fetchFantasyWatchlist("ldl").catch(() => null),
  ]);

  return (
    <WatchlistRadar
      initialRadar={ldlRadar}
      initialWatchlist={ldlWatchlist}
    />
  );
}
