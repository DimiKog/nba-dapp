import { CATEGORY_LABELS } from "@/lib/teamCategoryStrategy";

type CategoryChipTone =
  | "neutral"
  | "target"
  | "protect"
  | "flex"
  | "punt"
  | "helps"
  | "tradeoff";

const TONE_CLASS: Record<CategoryChipTone, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  target: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  protect: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  flex: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  punt: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  helps: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  tradeoff: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

/**
 * Compact category chip aligned with existing needs/strategy pill styling.
 */
export default function CategoryChip({
  categoryKey,
  label,
  tone = "neutral",
}: {
  categoryKey?: string;
  label?: string;
  tone?: CategoryChipTone;
}) {
  const text = label
    ?? (categoryKey ? (CATEGORY_LABELS[categoryKey] ?? categoryKey) : "");
  if (!text) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${TONE_CLASS[tone]}`}
    >
      {text}
    </span>
  );
}
