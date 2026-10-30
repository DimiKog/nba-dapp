import DiscoveryViewPlaceholder from "@/components/discovery/DiscoveryViewPlaceholder";
import type { DiscoveryLeagueSlug } from "@/lib/discoveryLeagues";

/** Slice 0 shell only — Watchlist migration lands in a later slice. */
export default function DiscoveryWatchedView({
  league,
}: {
  league: DiscoveryLeagueSlug;
}) {
  return <DiscoveryViewPlaceholder view="watched" league={league} />;
}
