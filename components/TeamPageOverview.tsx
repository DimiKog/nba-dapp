import type {
  FantasyRosterPerformance,
  FantasyTeamCategoryProfile,
} from "@/lib/api";

export default function TeamPageOverview({
  performance,
  profile,
}: {
  performance: FantasyRosterPerformance;
  profile: FantasyTeamCategoryProfile | null;
}) {
  const injured = performance.players.filter((player) => player.injury);
  const current = performance.payroll?.seasons[0] ?? null;
  const freshest = performance.players
    .map((player) => player.freshness.stats)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return (
    <section id="overview" className="mt-6 scroll-mt-32">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Roster" value={`${performance.players.length}`} detail="Active, Reserve and IR" />
        <SummaryCard
          label="Injury alerts"
          value={`${injured.length}`}
          detail={injured.map((player) => player.short_name).join(", ") || "No active alerts"}
          tone={injured.length ? "danger" : "default"}
        />
        <SummaryCard
          label="Current cap"
          value={current?.remaining == null ? "Not configured" : formatCapPosition(current.remaining)}
          detail={current ? `${current.season}${current.cap_provisional ? " · provisional" : ""}` : "Payroll unavailable"}
          tone={current?.remaining == null ? "default" : current.remaining >= 0 ? "positive" : "danger"}
        />
        <SummaryCard label="Data freshness" value={freshnessLabel(freshest)} detail={`${performance.window.from} – ${performance.window.to}`} />
      </div>

      {profile && (
        <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-2">
          <CategorySummary label="Strengths" values={profile.strengths} tone="positive" empty="No top-third categories" />
          <CategorySummary label="Weaknesses" values={profile.weaknesses} tone="danger" empty="No bottom-third categories" />
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "positive" | "danger";
}) {
  const styles = tone === "danger"
    ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
    : tone === "positive"
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30"
      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";
  const valueStyle = tone === "danger"
    ? "text-red-700 dark:text-red-300"
    : tone === "positive"
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-slate-900 dark:text-slate-100";
  return (
    <div className={`min-w-0 rounded-xl border p-4 ${styles}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-xl font-black tabular-nums ${valueStyle}`}>{value}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function CategorySummary({
  label,
  values,
  tone,
  empty,
}: {
  label: string;
  values: string[];
  tone: "positive" | "danger";
  empty: string;
}) {
  const chip = tone === "positive"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length ? values.map((value) => (
          <span key={value} className={`rounded-full px-2.5 py-1 text-xs font-bold ${chip}`}>{value}</span>
        )) : <span className="text-sm text-slate-400">{empty}</span>}
      </div>
    </div>
  );
}

function formatCapPosition(remaining: number) {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.abs(remaining));
  return remaining >= 0 ? `${amount} under` : `${amount} over`;
}

function freshnessLabel(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Available";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
