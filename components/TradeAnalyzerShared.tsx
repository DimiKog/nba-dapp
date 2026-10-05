import type { ReactNode } from "react";
import type { TradeBasis, TradeCapResult, TradePartner } from "@/lib/api";

export function ChipList({ label, values, tone }: { label: string; values: string[]; tone: "positive" | "danger" }) {
  if (!values.length) return null;
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">{values.map((value) => <span key={value} className={`rounded-md px-2 py-1 text-[10px] font-bold ${tone === "positive" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>{value}</span>)}</div>
    </div>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: TradePartner["confidence"] }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800">{confidence}</span>;
}

export function FallbackBanner() {
  return <p className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">No qualifying recent games were available, so season performance was used.</p>;
}

export function MethodNote({ children }: { children: ReactNode }) {
  return <p className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">{children}</p>;
}

export function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export function basisLabel(basis: TradeBasis) {
  return basis === "season" ? "Season performance" : "Recent 14-day performance";
}

export function phaseLabel(phase: "in_season" | "off_season") {
  return phase === "in_season" ? "In-season" : "Offseason";
}

export function capResultLabel(result: TradeCapResult) {
  const labels: Record<TradeCapResult, string> = {
    unknown: "Cap unavailable",
    compliant: "Cap compliant",
    not_cap_compliant: "Not cap compliant",
    requires_additional_move: "Additional move required",
    clears_cap: "Moves under the cap",
    moves_toward_cap: "Moves toward the cap",
    moves_away_from_cap: "Moves away from the cap",
    crosses_over: "Moves over the cap",
    remains_under: "Remains under the cap",
  };
  return labels[result];
}

export function capTone(result: TradeCapResult) {
  if (["compliant", "clears_cap", "moves_toward_cap", "remains_under"].includes(result)) return "text-emerald-600 dark:text-emerald-400";
  if (["not_cap_compliant", "requires_additional_move", "moves_away_from_cap", "crosses_over"].includes(result)) return "text-red-600 dark:text-red-400";
  return "text-amber-600 dark:text-amber-400";
}
