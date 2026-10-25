const LINKS = [
  ["overview", "Overview"],
  ["roster-watch", "Roster watch"],
  ["roster", "Roster"],
  ["payroll", "Payroll"],
  ["team-analysis", "Category analysis"],
  ["player-targets", "Player targets"],
] as const;

export default function TeamSectionNav({
  hasPayroll,
  hasWatch = false,
  hasOverview = true,
  hasAnalysis = true,
  hasTargets = true,
  targetsLabel = "Player targets",
}: {
  hasPayroll: boolean;
  hasWatch?: boolean;
  hasOverview?: boolean;
  hasAnalysis?: boolean;
  hasTargets?: boolean;
  targetsLabel?: string;
}) {
  const links = LINKS.filter(([id]) =>
    (hasOverview || id !== "overview") &&
    (hasWatch || id !== "roster-watch") &&
    (hasPayroll || id !== "payroll") &&
    (hasAnalysis || id !== "team-analysis") &&
    (hasTargets || id !== "player-targets"),
  );
  return (
    <nav aria-label="Team page sections" className="sticky top-14 z-20 -mx-4 mt-5 border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
      <div className="flex gap-1 overflow-x-auto">
        {links.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300">
            {id === "player-targets" ? targetsLabel : label}
          </a>
        ))}
      </div>
    </nav>
  );
}
