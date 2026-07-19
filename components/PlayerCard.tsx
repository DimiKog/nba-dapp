import Image from "next/image";
import Link from "next/link";
import { Player, photoUrl } from "@/lib/api";

export default function PlayerCard({ player }: { player: Player }) {
  const photo = photoUrl(player.photo, player.nba_id);

  return (
    <Link
      href={`/players/${player.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        {photo ? (
          <Image src={photo} alt={player.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl text-slate-400">
            {player.name[0]}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{player.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {player.position ?? "—"} · {player.team ?? "FA"}
        </p>
        {player.salary_current && (
          <p className="mt-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">{player.salary_current}</p>
        )}
      </div>
    </Link>
  );
}
