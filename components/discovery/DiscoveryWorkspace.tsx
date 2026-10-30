"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import DiscoveryBrowseView from "@/components/discovery/DiscoveryBrowseView";
import DiscoveryContextArea from "@/components/discovery/DiscoveryContextArea";
import DiscoveryFaTrendsView from "@/components/discovery/DiscoveryFaTrendsView";
import DiscoveryFitView from "@/components/discovery/DiscoveryFitView";
import DiscoveryLeagueControl from "@/components/discovery/DiscoveryLeagueControl";
import DiscoveryTabs from "@/components/discovery/DiscoveryTabs";
import DiscoveryWatchedView from "@/components/discovery/DiscoveryWatchedView";
import {
  isExplorerLeagueSlug,
  resolveDiscoveryLeague,
  type DiscoveryLeagueSlug,
} from "@/lib/discoveryLeagues";
import { buildDiscoveryHref, parseDiscoveryView } from "@/lib/discoveryViews";
import {
  getServerLeagueSnapshot,
  getStoredLeagueSnapshot,
  storeLeague,
  subscribeLeagueStore,
} from "@/lib/leagues";

function samePlayersLocation(left: string, right: string): boolean {
  const a = new URL(left, "http://local.discovery");
  const b = new URL(right, "http://local.discovery");
  if (a.pathname !== b.pathname) return false;
  const keys = new Set([...a.searchParams.keys(), ...b.searchParams.keys()]);
  for (const key of keys) {
    const leftValue = a.searchParams.get(key);
    const rightValue = b.searchParams.get(key);
    if (key === "view") {
      const normalizedLeft = leftValue && leftValue !== "browse" ? leftValue : null;
      const normalizedRight = rightValue && rightValue !== "browse" ? rightValue : null;
      if (normalizedLeft !== normalizedRight) return false;
      continue;
    }
    if (leftValue !== rightValue) return false;
  }
  return true;
}

export default function DiscoveryWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlLeague = searchParams.get("league");
  const urlView = searchParams.get("view");
  const urlTeam = searchParams.get("team");
  const storedLeague = useSyncExternalStore(
    subscribeLeagueStore,
    getStoredLeagueSnapshot,
    getServerLeagueSnapshot,
  );

  const league = resolveDiscoveryLeague(urlLeague, storedLeague);
  const view = parseDiscoveryView(urlView);

  useEffect(() => {
    if (isExplorerLeagueSlug(league)) {
      storeLeague(league);
    }

    const canonical = buildDiscoveryHref({
      league,
      view,
      team: urlTeam,
    });
    const current = `/players${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (!samePlayersLocation(current, canonical)) {
      router.replace(canonical, { scroll: false });
    }
  }, [league, view, urlTeam, router, searchParams]);

  function changeLeague(next: DiscoveryLeagueSlug) {
    if (next === league) return;
    if (isExplorerLeagueSlug(next)) {
      storeLeague(next);
    }
    router.replace(
      buildDiscoveryHref({ league: next, view, team: urlTeam }),
      { scroll: false },
    );
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1500px] px-4 py-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
            Player Discovery
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Players</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Explore the player pool, find players that fit your strategy, track targets,
            and monitor free-agent trends.
          </p>
        </div>
        <DiscoveryLeagueControl league={league} onChange={changeLeague} />
      </header>

      <div className="mt-6 space-y-5">
        <DiscoveryTabs league={league} view={view} team={urlTeam} />
        <DiscoveryContextArea league={league} view={view} />
      </div>

      <div className="mt-6" data-discovery-view={view} data-discovery-league={league}>
        {view === "browse" && <DiscoveryBrowseView league={league} />}
        {view === "fit" && <DiscoveryFitView league={league} />}
        {view === "watched" && <DiscoveryWatchedView league={league} />}
        {view === "fa-trends" && <DiscoveryFaTrendsView league={league} />}
      </div>
    </main>
  );
}
