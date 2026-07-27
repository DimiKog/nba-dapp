import { notFound } from "next/navigation";
import PlayerIntelligenceDashboard from "@/components/PlayerIntelligenceDashboard";
import { fetchFantasyWatchlist, fetchPlayer, fetchPlayerIntelligence } from "@/lib/api";

type League = "ldl" | "bdb";

export default async function PlayerPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ league?: string; from?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const playerId = Number(id);
  if (!Number.isInteger(playerId)) notFound();

  const requestedLeague: League | null = query.league === "ldl" || query.league === "bdb" ? query.league : null;
  const source = ["watchlist", "explorer", "recommendations", "roster"].includes(query.from ?? "") ? query.from! : null;
  const player = await fetchPlayer(playerId).catch(() => null);
  if (!player) notFound();
  const league = player.nba_id ? requestedLeague : null;

  const intelligence = await fetchPlayerIntelligence(playerId, {
    league: league ?? undefined,
    nbaId: player.nba_id,
    window: 14,
  }).catch(() => null);
  if (!intelligence) notFound();

  const watchlist = league ? await fetchFantasyWatchlist(league, 14).catch(() => null) : null;
  const initiallyWatched = Boolean(player.nba_id && watchlist?.entries.some((entry) => entry.nba_player_id === player.nba_id));

  return <PlayerIntelligenceDashboard intelligence={intelligence} contract={player.contract} birthDate={player.birth_date} league={league} source={source} initiallyWatched={initiallyWatched} />;
}
