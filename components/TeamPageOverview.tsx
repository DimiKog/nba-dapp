import type { FantasyRosterPerformance } from "@/lib/api";
import { leaguePresentation } from "@/lib/leagues";

export default function TeamPageOverview({
  performance,
  showCap = true,
}: {
  performance: FantasyRosterPerformance;
  showCap?: boolean;
}) {
  const injured = performance.players.filter((player) => player.injury);
  const current = performance.payroll?.seasons[0] ?? null;
  const presentation = leaguePresentation(performance.league.slug);
  const claimBudget = presentation?.showClaimTokens
    ? performance.team.claim_budget
    : null;
  const tenure = presentation?.showTenure
    ? performance.players.map((player) => player.tenure).filter(Boolean)
    : [];
  const finalYear = tenure.filter((entry) => entry?.status === "final_legal_year").length;
  const expired = tenure.filter((entry) => entry?.status === "tenure_expired_free_agent").length;
  const franchise = tenure.filter((entry) => entry?.franchise_player).length;
  const showTenure = presentation?.showTenure ?? false;
  const freshest = performance.players
    .map((player) => player.freshness.stats)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  const injuryNames = injured.map((player) => player.short_name).join(", ");
  const cells: StatusCell[] = [
    {
      label: "Roster",
      value: `${performance.players.length}`,
      detail: "Active · Reserve · IR",
    },
    {
      label: "Injuries",
      value: `${injured.length}`,
      detail: injuryNames || "No active alerts",
      title: injuryNames || undefined,
      tone: injured.length ? "danger" : "default",
    },
  ];

  if (showCap) {
    cells.push({
      label: "Cap",
      value: current?.remaining == null ? "—" : formatCapPosition(current.remaining),
      detail: current?.cap == null
        ? "Payroll unavailable"
        : `Cap ${formatCompactMoney(current.cap)}${current.cap_provisional ? " · provisional" : ""}`,
      tone: current?.remaining == null ? "default" : current.remaining >= 0 ? "positive" : "danger",
    });
  }

  if (showTenure) {
    cells.push({
      label: "Tenure",
      value: expired ? `${expired} must drop` : finalYear ? `${finalYear} final-year` : "Clear",
      detail: `${expired} expired · ${franchise} Franchise`,
      tone: expired ? "danger" : finalYear ? "accent" : "positive",
    });
  }

  if (claimBudget) {
    cells.push({
      label: "Tokens",
      value: formatTokenBalance(claimBudget.remaining),
      detail: `${presentation?.label} claim balance`,
      tone: "accent",
    });
  }

  cells.push({
    label: "Data",
    value: freshnessLabel(freshest),
    detail: `${performance.window.from} – ${performance.window.to}`,
  });

  return (
    <section id="overview" className="mt-6 scroll-mt-32">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap divide-x divide-slate-100 dark:divide-slate-800">
          {cells.map((cell) => (
            <StatusStripCell key={cell.label} {...cell} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Category strengths and gaps are in{" "}
        <a href="#team-analysis" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Category analysis
        </a>
        .
      </p>
    </section>
  );
}

type StatusCell = {
  label: string;
  value: string;
  detail: string;
  title?: string;
  tone?: "default" | "positive" | "danger" | "accent";
};

function StatusStripCell({
  label,
  value,
  detail,
  title,
  tone = "default",
}: StatusCell) {
  const valueStyle = tone === "danger"
    ? "text-red-700 dark:text-red-300"
    : tone === "positive"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "accent"
        ? "text-blue-700 dark:text-blue-300"
        : "text-slate-950 dark:text-white";
  const shell = tone === "danger"
    ? "bg-red-50/80 dark:bg-red-950/20"
    : tone === "positive"
      ? "bg-emerald-50/50 dark:bg-emerald-950/15"
      : tone === "accent"
        ? "bg-blue-50/60 dark:bg-blue-950/20"
        : "bg-transparent";

  return (
    <div
      title={title}
      className={`min-w-[7.5rem] flex-1 px-3 py-2.5 ${shell}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-black tabular-nums ${valueStyle}`}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">{detail}</p>
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

function formatCompactMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTokenBalance(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function freshnessLabel(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Available";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
