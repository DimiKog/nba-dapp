import Image from "next/image";
import Link from "next/link";
import { Player, photoUrl } from "@/lib/api";

export default function PlayerCard({ player }: { player: Player }) {
  const photo = photoUrl(player.photo, player.nba_id);

  return (
    <Link
      href={`/players/${player.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100">
        {photo ? (
          <Image src={photo} alt={player.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl text-slate-400">
            {player.name[0]}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{player.name}</p>
        <p className="text-xs text-slate-500">
          {player.position ?? "—"} · {player.team ?? "FA"}
        </p>
        {player.salary_current && (
          <p className="mt-0.5 text-xs font-medium text-blue-700">{player.salary_current}</p>
        )}
      </div>
    </Link>
  );
}
