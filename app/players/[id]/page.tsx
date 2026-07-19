import Image from "next/image";
import Link from "next/link";
import { fetchPlayer, photoUrl } from "@/lib/api";
import { notFound } from "next/navigation";

const YEARS = ["2024-25", "2025-26", "2026-27", "2027-28", "2028-29", "2029-30", "2030-31"] as const;
const CURRENT_SEASON = "2026-27";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let player;
  try {
    player = await fetchPlayer(Number(id));
  } catch {
    notFound();
  }

  const photo = photoUrl(player.photo, player.nba_id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/players" className="text-sm text-blue-500 hover:underline">
        ← All players
      </Link>

      <div className="mt-6 flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          {photo ? (
            <Image src={photo} alt={player.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-slate-400">
              {player.name[0]}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{player.name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {player.position ?? "—"} · {player.team ?? "Free Agent"}
          </p>
          {player.birth_date && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Born: {player.birth_date}</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Contract</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">Season</th>
                <th className="px-4 py-2 text-right">Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {YEARS.map((yr) => {
                const val = player.contract[yr];
                if (!val) return null;
                const isCurrent = yr === CURRENT_SEASON;
                return (
                  <tr key={yr} className={isCurrent ? "bg-blue-50 dark:bg-blue-950" : "bg-white dark:bg-slate-900"}>
                    <td className={`px-4 py-2 ${isCurrent ? "font-semibold text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {yr}{isCurrent && " ✦"}
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums ${isCurrent ? "font-semibold text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {val}
                    </td>
                  </tr>
                );
              })}
              {player.contract.guaranteed && (
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <td className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Guaranteed</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-600 dark:text-slate-400">
                    {player.contract.guaranteed}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
