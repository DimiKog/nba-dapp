"use client";

import {
  DISCOVERY_LEAGUE_SLUGS,
  discoveryLeagueLabel,
  type DiscoveryLeagueSlug,
} from "@/lib/discoveryLeagues";

export default function DiscoveryLeagueControl({
  league,
  onChange,
}: {
  league: DiscoveryLeagueSlug;
  onChange: (next: DiscoveryLeagueSlug) => void;
}) {
  return (
    <div
      className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
      role="group"
      aria-label="Discovery league"
    >
      {DISCOVERY_LEAGUE_SLUGS.map((item) => {
        const active = item === league;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              active
                ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {discoveryLeagueLabel(item)}
          </button>
        );
      })}
    </div>
  );
}
