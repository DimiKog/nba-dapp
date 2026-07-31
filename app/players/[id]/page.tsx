import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerIntelligenceDashboard from "@/components/PlayerIntelligenceDashboard";
import { ApiResponseError, fetchFantasyWatchlist, fetchPlayer, fetchPlayerIntelligence, photoUrl, type PlayerDetail } from "@/lib/api";

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
  let player: PlayerDetail;
  try {
    player = await fetchPlayer(playerId);
  } catch (error) {
    if (error instanceof ApiResponseError && error.status === 404) notFound();
    return <PlayerUnavailable title="Player profile temporarily unavailable" retryHref={currentHref(playerId, query)} />;
  }
  if (!player.nba_id) return <PlayerIdentityUnresolved player={player} />;
  const league = requestedLeague;

  const intelligence = await fetchPlayerIntelligence(playerId, {
    league: league ?? undefined,
    nbaId: player.nba_id,
    window: 7,
  }).catch(() => null);
  if (!intelligence) return <PlayerUnavailable title={`${player.name}'s intelligence is temporarily unavailable`} retryHref={currentHref(playerId, query)} />;

  const watchlist = league ? await fetchFantasyWatchlist(league, 7).catch(() => null) : null;
  const initiallyWatched = Boolean(player.nba_id && watchlist?.entries.some((entry) => entry.nba_player_id === player.nba_id));

  return <PlayerIntelligenceDashboard intelligence={intelligence} contract={player.contract} birthDate={player.birth_date} league={league} source={source} initiallyWatched={initiallyWatched} />;
}

function PlayerIdentityUnresolved({ player }: { player: PlayerDetail }) {
  const photo = photoUrl(player.photo, player.nba_id);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Link href="/players" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">← Player Explorer</Link>
      <section className="mt-5 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm dark:border-amber-900 dark:bg-slate-900">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-slate-200 dark:bg-slate-700">
            {photo ? <Image src={photo} alt={player.name} fill unoptimized className="object-cover" /> : <span className="flex h-full items-center justify-center text-4xl font-black text-slate-400">{player.name[0]}</span>}
          </div>
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Identity match pending</p><h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{player.name}</h1><p className="mt-1 text-sm text-slate-500">{player.position ?? "Position unavailable"} · {player.team ?? "NBA team unavailable"}</p></div>
        </div>
        <div className="border-t border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          NBA and fantasy intelligence cannot be calculated until this player is matched to an NBA identity. The player record remains available, but LDL and BδB context is disabled for now.
        </div>
      </section>
    </main>
  );
}

function PlayerUnavailable({ title, retryHref }: { title: string; retryHref: string }) {
  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-2xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-amber-200 bg-amber-50 p-7 text-center shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Temporary interruption</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600 dark:text-slate-300">The data service did not complete this request. Nothing is wrong with the player record; please try again shortly.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={retryHref} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Try again</a>
          <Link href="/players" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Player Explorer</Link>
        </div>
      </section>
    </main>
  );
}

function currentHref(id: number, query: { league?: string; from?: string }) {
  const params = new URLSearchParams();
  if (query.league) params.set("league", query.league);
  if (query.from) params.set("from", query.from);
  return `/players/${id}${params.size ? `?${params}` : ""}`;
}
