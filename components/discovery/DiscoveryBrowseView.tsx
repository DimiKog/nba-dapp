"use client";

import LeaguePlayerExplorer from "@/components/LeaguePlayerExplorer";
import DiscoveryViewPlaceholder from "@/components/discovery/DiscoveryViewPlaceholder";
import {
  isExplorerLeagueSlug,
  type DiscoveryLeagueSlug,
} from "@/lib/discoveryLeagues";

/**
 * Mount the shared neutral LeaguePlayerExplorer for every Discovery explorer league.
 * Pass league explicitly so GNFC never remaps to LDL/BδB via legacy storage helpers.
 */
export default function DiscoveryBrowseView({
  league,
}: {
  league: DiscoveryLeagueSlug;
}) {
  if (!isExplorerLeagueSlug(league)) {
    return <DiscoveryViewPlaceholder view="browse" league={league} variant="browse-pending" />;
  }

  return <LeaguePlayerExplorer embedded league={league} />;
}
