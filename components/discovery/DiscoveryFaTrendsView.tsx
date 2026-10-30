import DiscoveryViewPlaceholder from "@/components/discovery/DiscoveryViewPlaceholder";
import type { DiscoveryLeagueSlug } from "@/lib/discoveryLeagues";

/** Slice 0 shell only — FA Radar migration lands in a later slice. */
export default function DiscoveryFaTrendsView({
  league,
}: {
  league: DiscoveryLeagueSlug;
}) {
  return <DiscoveryViewPlaceholder view="fa-trends" league={league} />;
}
