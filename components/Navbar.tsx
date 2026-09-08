"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  getServerLeagueSnapshot,
  getStoredLeagueSnapshot,
  storeLeague,
  subscribeLeagueStore,
  type LeagueSlug,
} from "@/lib/leagues";
import type { FantasySession } from "@/lib/fantasySessionTypes";

type NavLink = {
  href: string;
  path: string;
  label: string;
};

function resolveNavbarLeague(
  pathname: string,
  leagueParam: string | null,
  storedLeague: LeagueSlug,
): LeagueSlug {
  if (leagueParam === "ldl" || leagueParam === "bdb") return leagueParam;
  const fantasyMatch = pathname.match(/^\/fantasy\/(ldl|bdb)(?:\/|$)/);
  if (fantasyMatch?.[1] === "ldl" || fantasyMatch?.[1] === "bdb") {
    return fantasyMatch[1];
  }
  return storedLeague;
}

export default function Navbar({ session }: { session: FantasySession | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storedLeague = useSyncExternalStore(
    subscribeLeagueStore,
    getStoredLeagueSnapshot,
    getServerLeagueSnapshot,
  );
  const league = resolveNavbarLeague(pathname, searchParams.get("league"), storedLeague);

  useEffect(() => {
    storeLeague(league);
  }, [league]);

  const membership = session?.memberships.find((item) => item.league_slug === league);
  const links: NavLink[] = [
    { href: `/players?league=${league}`, path: "/players", label: "Player Explorer" },
    { href: `/watchlist?league=${league}`, path: "/watchlist", label: "Watchlist" },
    { href: `/draft-assets?league=${league}`, path: "/draft-assets", label: "Draft Assets" },
    ...(membership?.commissioner
      ? [{ href: `/commissioner/trades?league=${league}`, path: "/commissioner/trades", label: "Commissioner" }]
      : []),
    ...(session?.memberships.some((item) => item.league_slug === "ldl" && item.fantrax_team_id)
      ? [{ href: "/fantasy/ldl/my-team", path: "/fantasy/ldl", label: "My LDL" }]
      : []),
    ...(session?.memberships.some((item) => item.league_slug === "bdb" && item.fantrax_team_id)
      ? [{ href: "/fantasy/bdb/my-team", path: "/fantasy/bdb", label: "My BδB" }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:flex-nowrap">
        <Link href="/" className="text-base font-bold text-slate-900 dark:text-slate-100 shrink-0">
          🏀 My NBA
        </Link>

        <div className="order-3 flex w-full items-center gap-1 overflow-x-auto pr-8 shadow-[inset_-16px_0_12px_-12px_rgba(15,23,42,0.18)] sm:order-none sm:ml-2 sm:w-auto sm:overflow-visible sm:pr-0 sm:shadow-none dark:shadow-[inset_-16px_0_12px_-12px_rgba(255,255,255,0.12)]">
          {links.map(({ href, path, label }) => {
            const active = pathname === path || pathname.startsWith(`${path}/`);
            return (
              <Link
                key={path}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <a
          href="/cdn-cgi/access/logout"
          className="ml-auto shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          Sign out
        </a>
      </nav>
    </header>
  );
}
