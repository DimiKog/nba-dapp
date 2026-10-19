import Link from "next/link";
import type { ReactNode } from "react";
import type { FantasyTeamCategoryProfile } from "@/lib/api";

export default function HomeCategoryOutlook({
  analysisHref,
  profile,
  profileContext = "season profile",
  summary,
}: {
  analysisHref: string;
  profile: FantasyTeamCategoryProfile | null;
  profileContext?: string;
  summary: ReactNode;
}) {
  return (
    <div className="border-b border-blue-100 bg-white/80 px-5 py-4 dark:border-blue-900/70 dark:bg-slate-950/30">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Category outlook</p>
        <Link href={analysisHref} className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Full analysis →
        </Link>
      </div>
      {summary}
      {profile?.sample.players_included ? (
        <div className="mt-3">
          <p className="mb-2 text-[11px] text-slate-500">
            {profile.window.season} {profileContext} · {profile.sample.players_included} players with stats
            {profile.sample.players_missing_stats > 0 ? ` · ${profile.sample.players_missing_stats} without stats; provisional` : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <HomeProfileLine label="Strengths" values={profile.strengths} tone="strength" empty="No top-third categories" />
            <HomeProfileLine label="Weaknesses" values={profile.weaknesses} tone="weakness" empty="No bottom-third categories" />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          {profile ? "Category profile awaits recorded games." : "Category details are temporarily unavailable."}
        </p>
      )}
    </div>
  );
}

function HomeProfileLine({
  label,
  values,
  tone,
  empty,
}: {
  label: string;
  values: string[];
  tone: "strength" | "weakness";
  empty: string;
}) {
  const color = tone === "strength"
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-rose-700 dark:text-rose-400";
  const visible = values.slice(0, 3);
  const remaining = Math.max(values.length - visible.length, 0);
  const summary = remaining ? `${visible.join(" · ")} · +${remaining} more` : visible.join(" · ");
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate text-xs font-bold ${values.length ? color : "text-slate-400"}`}>
        {summary || empty}
      </p>
    </div>
  );
}
