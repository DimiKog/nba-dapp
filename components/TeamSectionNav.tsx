const LINKS = [
  ["overview", "Overview"],
  ["intelligence", "Intelligence"],
  ["recommended-moves", "Recommended moves"],
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
  hasIntelligence = false,
  hasAnalysis = true,
  hasTargets = true,
  hasRecommendedMoves = false,
  targetsLabel = "Player targets",
}: {
  hasPayroll: boolean;
  hasWatch?: boolean;
  hasOverview?: boolean;
  /** LDL/BDB unified Intelligence anchor. When set, omit legacy recommended-moves / analysis / targets nav items. */
  hasIntelligence?: boolean;
  hasAnalysis?: boolean;
  hasTargets?: boolean;
  hasRecommendedMoves?: boolean;
  targetsLabel?: string;
}) {
  const links = LINKS.filter(([id]) =>
    (hasOverview || id !== "overview") &&
    (hasIntelligence || id !== "intelligence") &&
    // Legacy LDL items stay off when Intelligence is the LDL/BDB nav model.
    ((hasRecommendedMoves && !hasIntelligence) || id !== "recommended-moves") &&
    (hasWatch || id !== "roster-watch") &&
    (hasPayroll || id !== "payroll") &&
    ((hasAnalysis && !hasIntelligence) || id !== "team-analysis") &&
    ((hasTargets && !hasIntelligence) || id !== "player-targets"),
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
