import type { FantasyPlayerPerformance } from "@/lib/api";

type RosterWatch = NonNullable<FantasyPlayerPerformance["roster_watch"]>;

export default function RosterWatchBadges({ watch }: { watch: RosterWatch | undefined }) {
  if (!watch || watch.basis !== "completed_game_logs") return null;

  const role = watch.role.state === "watch"
    ? { label: "Lower minutes", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" }
    : watch.role.state === "early_watch"
      ? { label: "Possible minutes drop", tone: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" }
      : watch.role.state === "limited_observed"
        ? { label: "Limited observed role", tone: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" }
        : null;
  const production = watch.production.state === "review"
    ? { label: "Production dip", tone: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" }
    : null;
  const badges = [role, production].filter((badge) => badge !== null);
  if (!badges.length) return null;

  return (
    <span className="inline-flex max-w-full flex-wrap gap-1" aria-label="Roster watch signals">
      {badges.map((badge) => (
        <span key={badge.label} className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-4 ${badge.tone}`}>
          {badge.label}
        </span>
      ))}
    </span>
  );
}
