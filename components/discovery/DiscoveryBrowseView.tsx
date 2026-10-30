"use client";

import LeaguePlayerExplorer from "@/components/LeaguePlayerExplorer";
import DiscoveryViewPlaceholder from "@/components/discovery/DiscoveryViewPlaceholder";
import {
  isExplorerLeagueSlug,
  type DiscoveryLeagueSlug,
} from "@/lib/discoveryLeagues";

/**
 * Slice 0: mount existing Explorer for LDL/BδB with minimal embed.
 * GNFC Browse stays a deliberate placeholder — no silent LDL remap, no premature API fetch.
 */
export default function DiscoveryBrowseView({
  league,
}: {
  league: DiscoveryLeagueSlug;
}) {
  if (!isExplorerLeagueSlug(league)) {
    return <DiscoveryViewPlaceholder view="browse" league={league} variant="browse-pending" />;
  }

  return <LeaguePlayerExplorer embedded />;
}
