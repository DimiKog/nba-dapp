import { redirect } from "next/navigation";
import { buildWatchlistRedirectHref } from "@/lib/discoveryViews";

type PageSearchParams = Promise<{ league?: string }>;

/**
 * Compatibility redirect: Watchlist → Player Discovery Watched view.
 * Preserves an explicit league query (including gnfc) without remapping.
 */
export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  redirect(buildWatchlistRedirectHref(params.league));
}
