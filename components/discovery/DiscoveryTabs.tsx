"use client";

import Link from "next/link";
import {
  DISCOVERY_VIEWS,
  DISCOVERY_VIEW_LABELS,
  buildDiscoveryHref,
  type DiscoveryView,
} from "@/lib/discoveryViews";
import type { DiscoveryLeagueSlug } from "@/lib/discoveryLeagues";

export default function DiscoveryTabs({
  league,
  view,
  team,
}: {
  league: DiscoveryLeagueSlug;
  view: DiscoveryView;
  team?: string | null;
}) {
  return (
    <nav
      aria-label="Player Discovery views"
      className="-mx-1 overflow-x-auto px-1"
    >
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex w-max min-w-full gap-1 rounded-2xl bg-slate-100/90 p-1 dark:bg-slate-800/90 sm:w-full sm:min-w-0"
      >
        {DISCOVERY_VIEWS.map((item) => {
          const active = item === view;
          const href = buildDiscoveryHref({ league, view: item, team });
          return (
            <Link
              key={item}
              href={href}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors sm:flex-1 sm:text-center ${
                active
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {DISCOVERY_VIEW_LABELS[item]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
