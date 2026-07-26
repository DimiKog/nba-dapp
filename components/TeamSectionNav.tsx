const LINKS = [
  ["overview", "Overview"],
  ["roster", "Roster"],
  ["payroll", "Payroll"],
  ["team-analysis", "Category analysis"],
  ["player-targets", "Player targets"],
] as const;

export default function TeamSectionNav({ hasPayroll }: { hasPayroll: boolean }) {
  return (
    <nav aria-label="Team page sections" className="sticky top-14 z-20 -mx-4 mt-5 border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
      <div className="flex gap-1 overflow-x-auto">
        {LINKS.filter(([id]) => hasPayroll || id !== "payroll").map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300">
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
