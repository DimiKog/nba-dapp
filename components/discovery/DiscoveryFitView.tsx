import DiscoveryViewPlaceholder from "@/components/discovery/DiscoveryViewPlaceholder";
import type { DiscoveryLeagueSlug } from "@/lib/discoveryLeagues";

/** Slice 0 shell only — Fit implementation lands in a later slice. */
export default function DiscoveryFitView({
  league,
}: {
  league: DiscoveryLeagueSlug;
}) {
  return <DiscoveryViewPlaceholder view="fit" league={league} />;
}
