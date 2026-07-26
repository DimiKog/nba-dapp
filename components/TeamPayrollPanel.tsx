import type { FantasyRosterPerformance } from "@/lib/api";

type Payroll = NonNullable<FantasyRosterPerformance["payroll"]>;
type PayrollSeason = Payroll["seasons"][number];

export default function TeamPayrollPanel({ payroll }: { payroll: Payroll }) {
  return (
    <section id="payroll" className="mt-10 scroll-mt-32 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Team finances</p>
          <h2 className="mt-0.5 text-lg font-black text-slate-950 dark:text-white">Payroll outlook</h2>
          <p className="text-xs text-slate-500">Active, Reserve and Injured Reserve players</p>
        </div>
        <p className="text-xs text-slate-500">Players without a contract count as $0</p>
      </div>
      <div className="grid gap-px bg-slate-200 dark:bg-slate-700 sm:grid-cols-2 xl:grid-cols-6">
        {payroll.seasons.map((season, index) => (
          <PayrollCard key={season.season} season={season} current={index === 0} />
        ))}
      </div>
    </section>
  );
}

function PayrollCard({ season, current }: { season: PayrollSeason; current: boolean }) {
  return (
    <div className={current ? "bg-blue-50 p-5 sm:col-span-2 dark:bg-blue-950/40" : "bg-white p-4 dark:bg-slate-900"}>
      <div className="flex items-center justify-between gap-2">
        <p className={`font-bold ${current ? "text-sm text-blue-700 dark:text-blue-300" : "text-xs text-slate-500"}`}>
          {season.season}{current ? " · Current season" : ""}
        </p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${capStatusClasses(season.status)}`}>{capStatusLabel(season.status)}</span>
      </div>
      <p className={`mt-2 font-bold tabular-nums text-slate-900 dark:text-slate-100 ${current ? "text-3xl" : "text-lg"}`}>{formatMoney(season.total)}</p>
      <p className="mt-1 text-xs text-slate-500">{season.cap == null ? "No cap configured" : `Cap ${formatMoney(season.cap)}${season.cap_provisional ? " · provisional" : ""}`}</p>
      {season.remaining != null && (
        <p className={`mt-1 text-xs font-medium ${season.remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {season.remaining >= 0 ? `${formatMoney(season.remaining)} available` : `${formatMoney(Math.abs(season.remaining))} over`}
        </p>
      )}
      {season.free_agents > 0 && <p className="mt-1 text-xs font-medium text-slate-500">{season.free_agents} free {season.free_agents === 1 ? "agent" : "agents"} · $0</p>}
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function capStatusClasses(status: PayrollSeason["status"]) {
  if (status === "under") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (status === "over") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
}

function capStatusLabel(status: PayrollSeason["status"]) {
  if (status === "under") return "Under cap";
  if (status === "over") return "Over cap";
  return "Cap not set";
}
