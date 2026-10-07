"use client";

import Image from "next/image";
import { capResultLabel, capTone } from "@/components/TradeAnalyzerShared";
import { photoUrl, type FantasyPlayerPerformance, type TradeAcquisitionContext, type TradeCategoryChange, type TradeCategoryStrategyContext, type TradePackageProductionValue, type TradePayrollComparison, type TradeTeamResult } from "@/lib/api";

export function SelectedPlayer({ player }: { player: FantasyPlayerPerformance }) {
  const photo = photoUrl(player.photo, player.nba_id);
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        {photo ? <Image src={photo} alt={player.name} fill className="object-cover" unoptimized /> : <span className="flex h-full items-center justify-center font-bold text-slate-400">{player.name[0]}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-slate-950 dark:text-white">{player.name}</p>
        <p className="truncate text-xs text-slate-500">{[player.nba_team_short || player.nba_team, player.position, player.fantasy_team?.name].filter(Boolean).join(" · ")}</p>
        {player.injury && <p className="mt-1 truncate text-xs font-medium text-red-600 dark:text-red-400">{injuryText(player)}</p>}
      </div>
      <p className="text-sm font-bold tabular-nums text-blue-700 dark:text-blue-300">{player.salary_2026_27 ?? "$0"}</p>
    </div>
  );
}

export function oneForOneValueVerdict(value: TradePackageProductionValue) {
  if (value.classification === "balanced") return {
    label: "Player value balanced",
    description: "The player-only return clears the current production-value threshold.",
    box: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/25",
    text: "text-emerald-800 dark:text-emerald-200",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  };
  if (value.classification === "materially_equivalent") return {
    label: "Roster-boundary comparison",
    description: "Both players are at or below the production level around the league's final normal roster spots. This remains exploratory because the model cannot distinguish a strict win-win return.",
    box: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/25",
    text: "text-sky-800 dark:text-sky-200",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200",
  };
  if (value.classification === "uneven") return {
    label: "Additional assets required",
    description: "The player return is close, but a useful pick or another asset should bridge the value gap.",
    box: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25",
    text: "text-amber-900 dark:text-amber-200",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  };
  if (value.classification === "severely_uneven") return {
    label: "Not recommended player-only",
    description: "The production gap is too large to call this balanced without substantial additional compensation.",
    box: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25",
    text: "text-red-800 dark:text-red-200",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  };
  return {
    label: "Player value unavailable",
    description: "The analyzer could not establish a trusted roster-boundary comparison.",
    box: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60",
    text: "text-slate-700 dark:text-slate-200",
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
  };
}

export function AcquisitionContextPanel({ context }: { context: TradeAcquisitionContext }) {
  const presentation = context.status === "free_agency_closed"
    ? {
      badge: "FA closed",
      title: "Free agents are not available yet",
      classes: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200",
    }
    : context.status === "tokens_required"
      ? {
        badge: "Tokens required",
        title: "Acquisition cost is separate",
        classes: "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/25 dark:text-violet-200",
      }
      : context.status === "free_agency_open_cap_not_enforced"
        ? {
          badge: "FA open · cap later",
          title: "Free agency is open before cap enforcement",
          classes: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-200",
        }
        : context.status === "free_agency_open_cap_enforced"
          ? {
            badge: "FA open · cap active",
            title: "Free agency and cap rules are active",
            classes: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-200",
          }
          : {
            badge: "Rules unavailable",
            title: "Acquisition context needs review",
            classes: "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200",
          };
  return (
    <div className={`border-b px-5 py-4 ${presentation.classes}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black">{presentation.title}</p>
          <p className="mt-1 text-xs opacity-85">{context.message}</p>
          <p className="mt-1 text-[11px] opacity-70">Player production is measured independently against the marginal roster boundary.</p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-wide dark:bg-slate-950/35">{presentation.badge}</span>
      </div>
    </div>
  );
}

export function StrategyImpactPanel({
  strategy,
  changes,
  compact = false,
}: {
  strategy?: TradeCategoryStrategyContext;
  changes: TradeCategoryChange[];
  compact?: boolean;
}) {
  const byKey = new Map(changes.map((change) => [change.key, change]));
  if (!strategy?.applied) {
    return (
      <div className={`${compact ? "mx-4 mt-3" : "mx-4 mt-4"} rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400`}>
        Balanced category scoring is used because this team has no saved Target/Punt strategy.
      </div>
    );
  }

  const targets = strategy.target_categories.map((key) => {
    const change = byKey.get(key);
    const positive = change && ["weakness_resolved", "improved"].includes(change.transition);
    const negative = change && ["new_weakness", "declined"].includes(change.transition);
    return {
      key,
      label: change?.label ?? key,
      state: positive ? "improves" : negative ? "declines" : "holds",
    };
  });
  const puntLabels = strategy.punt_categories.map(
    (key) => byKey.get(key)?.label ?? key,
  );

  return (
    <div className={`${compact ? "mx-4 mt-3 rounded-xl border border-blue-200 px-3 py-2.5 dark:border-blue-900" : "border-b border-slate-200 px-4 py-3 dark:border-slate-700"} bg-blue-50/60 dark:bg-blue-950/20`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
          Strategy v{strategy.version ?? "?"} applied
        </span>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Targets count 2× · Punts do not drive ranking
        </span>
      </div>
      {targets.length || puntLabels.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {targets.map((target) => (
            <span
              key={target.key}
              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                target.state === "improves"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : target.state === "declines"
                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                    : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              Target {target.label}: {target.state}
            </span>
          ))}
          {puntLabels.map((label) => (
            <span key={label} className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              Punt {label}: discounted
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Every category is Neutral, so balanced category scoring is unchanged.
        </p>
      )}
    </div>
  );
}

export function retainedValuePercent(value: number | null): number | null {
  return value == null ? null : Math.round(value * 100);
}

export function PayrollComparison({ selected, counterparty }: { selected: TradeTeamResult; counterparty: TradeTeamResult }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Cap intelligence</p>
        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Five-year payroll impact</h2>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-2">
        <TeamPayrollTrade name={selected.team.name} payroll={selected.payroll} />
        <TeamPayrollTrade name={counterparty.team.name} payroll={counterparty.payroll} />
      </div>
    </div>
  );
}

function TeamPayrollTrade({ name, payroll }: { name: string; payroll: TradePayrollComparison }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <p className="truncate text-sm font-black text-slate-950 dark:text-white">{name}</p>
        <span className={`text-xs font-bold ${capTone(payroll.current_cap_result)}`}>{capResultLabel(payroll.current_cap_result)}</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {payroll.seasons.map((season) => (
          <div key={season.season} className="grid grid-cols-[70px_1fr_auto] items-center gap-2 px-3 py-2 text-xs">
            <span className="font-bold text-slate-500">{season.season}</span>
            <span className="text-right tabular-nums text-slate-500">{formatMoney(season.before.total)} → <strong className="text-slate-800 dark:text-slate-100">{formatMoney(season.after.total)}</strong></span>
            <span className={`min-w-20 text-right font-bold tabular-nums ${season.delta <= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatSignedMoney(season.delta)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function injuryText(player: FantasyPlayerPerformance) {
  if (!player.injury) return "";
  return [player.injury.body_part, player.injury.detail || player.injury.status].filter(Boolean).join(" · ");
}

export function formatRank(value: number | null) {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatSignedMoney(value: number) {
  const amount = formatMoney(Math.abs(value));
  return value > 0 ? `+${amount}` : value < 0 ? `-${amount}` : "$0";
}
