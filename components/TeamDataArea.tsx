import type { ReactNode } from "react";

/**
 * LDL/BDB Team Data composition unit (roster + payroll).
 * Swap with TeamIntelligenceArea in FantasyRosterPage to reverse page order.
 */
export default function TeamDataArea({ children }: { children: ReactNode }) {
  return (
    <div className="mt-10">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Team data
      </p>
      <div className="space-y-0">{children}</div>
    </div>
  );
}
