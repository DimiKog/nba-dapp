import Image from "next/image";
import Link from "next/link";
import GnfcAvailabilityNotice from "@/components/GnfcAvailabilityNotice";
import CategoryNeedsSection from "@/components/CategoryNeedsSection";
import { fetchFantasyCategoryTargets, fetchFantasyLeagues, fetchFantasyRoster, fetchFantasyStandings, photoUrl, type FantasyPlayer } from "@/lib/api";
import { loadCurrentFantasyAccess, membershipFor } from "@/lib/fantasySessionServer";

const ROSTER_SECTIONS = [
  { status: "Active", label: "Active" },
  { status: "Reserve", label: "Reserve" },
  { status: "IR", label: "Injured reserve" },
] as const;

export default async function GnfcRosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const [roster, teams, leagues] = await Promise.all([
    fetchFantasyRoster("gnfc", teamId).catch(() => null),
    fetchFantasyStandings("gnfc").catch(() => []),
    fetchFantasyLeagues().catch(() => []),
  ]);

  if (!roster) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link href="/fantasy/gnfc" className="text-sm font-semibold text-blue-600 hover:underline">← GNFC Γ5 standings</Link>
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Could not load this Fantrax roster right now.</p>
      </main>
    );
  }

  const config = leagues.find((league) => league.slug === "gnfc");
  const access = await loadCurrentFantasyAccess();
  const isPersonalTeam = membershipFor(access?.session ?? null, "gnfc")?.fantrax_team_id === teamId;
  const showTargets = isPersonalTeam && Boolean(config?.availability_ready) && roster.players.length > 0;
  const initialTargets = showTargets
    ? await fetchFantasyCategoryTargets("gnfc", teamId, { actionScope: "all" }, access?.identityHeaders).catch(() => null)
    : null;
  const knownStatuses = new Set<string>(ROSTER_SECTIONS.map((section) => section.status));
  const otherPlayers = roster.players.filter((player) => !knownStatuses.has(player.status));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link href="/fantasy/gnfc" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
        ← GNFC Γ5 standings
      </Link>
      <header className="mt-5 flex items-center gap-4">
        {roster.logo && <Image src={roster.logo} alt="" width={56} height={56} className="h-14 w-14 rounded-full" unoptimized />}
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">GNFC Γ5 · roster preview</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{roster.team_name}</h1>
          {roster.owner && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fantrax owner: {roster.owner}</p>}
        </div>
      </header>

      <div className="mt-7">
        <GnfcAvailabilityNotice
          joinedTeams={teams.length}
          expectedTeams={config?.expected_team_count ?? 12}
          availabilityReady={config?.availability_ready ?? false}
        />
      </div>

      {roster.players.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">No drafted players yet</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Fantrax currently shows an empty roster. This page will show players as the draft and roster updates arrive.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {ROSTER_SECTIONS.map(({ status, label }) => {
            const players = roster.players.filter((player) => player.status === status);
            return players.length ? <RosterSection key={status} label={label} players={players} /> : null;
          })}
          {otherPlayers.length > 0 && <RosterSection label="Other" players={otherPlayers} />}
        </div>
      )}
      {showTargets && (
        <CategoryNeedsSection
          league="gnfc"
          teamId={teamId}
          teamName={roster.team_name}
          initialTargets={initialTargets}
          isPersonalTeam
        />
      )}
    </main>
  );
}

function RosterSection({ label, players }: { label: string; players: FantasyPlayer[] }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label} · {players.length}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {players.map((player) => {
          const photo = photoUrl(player.photo, player.nba_id);
          return (
            <article key={player.fantrax_scorer_id ?? player.nba_id ?? player.name} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                {photo ? <Image src={photo} alt="" fill className="object-cover" unoptimized /> : <span className="flex h-full items-center justify-center font-bold text-slate-400">{player.name[0]}</span>}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950 dark:text-white">{player.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{player.nba_team_short || "NBA team unavailable"} · {player.position || "Position unavailable"}</p>
                {player.injury && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">{player.injury}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
