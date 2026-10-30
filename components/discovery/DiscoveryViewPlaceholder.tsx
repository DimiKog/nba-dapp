import { DISCOVERY_VIEW_LABELS, type DiscoveryView } from "@/lib/discoveryViews";
import { discoveryLeagueLabel, type DiscoveryLeagueSlug } from "@/lib/discoveryLeagues";

const VIEW_COPY: Record<Exclude<DiscoveryView, "browse">, { title: string; body: string }> = {
  fit: {
    title: "Fit to my plan is being consolidated",
    body: "Strategy-aware player discovery will move here from Category Needs / player targets. Automatic needs will continue to use System Recommended Strategy TARGET categories only — without an opaque Fit Score.",
  },
  watched: {
    title: "Watched is being consolidated",
    body: "Your manager Watchlist will live here as persistent, user-controlled state — separate from Roster Watch on the team page.",
  },
  "fa-trends": {
    title: "FA trends is being consolidated",
    body: "Free-agent radar and current-form discovery will move here. Ranking stays trend-based and is not team-need fit.",
  },
};

export default function DiscoveryViewPlaceholder({
  view,
  league,
  variant = "consolidating",
}: {
  view: Exclude<DiscoveryView, "browse"> | "browse";
  league: DiscoveryLeagueSlug;
  variant?: "consolidating" | "browse-pending";
}) {
  if (variant === "browse-pending" || view === "browse") {
    return (
      <section
        aria-label="Browse unavailable"
        className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
          Browse · {discoveryLeagueLabel(league)}
        </p>
        <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
          GNFC Browse arrives in a later slice
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
          Neutral Player Explorer is available today for LDL and BδB. GNFC is a real Discovery
          league here — it is not remapped to LDL — and Browse will connect once that view is migrated.
        </p>
      </section>
    );
  }

  const copy = VIEW_COPY[view];
  return (
    <section
      aria-label={`${DISCOVERY_VIEW_LABELS[view]} placeholder`}
      className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
        {DISCOVERY_VIEW_LABELS[view]} · {discoveryLeagueLabel(league)}
      </p>
      <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{copy.title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{copy.body}</p>
    </section>
  );
}
