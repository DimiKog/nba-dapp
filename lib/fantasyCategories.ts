import type { FantasyPlayerStats } from "@/lib/api";

export type FantasyCategoryKey =
  | "fg_pct"
  | "three_pm"
  | "ft_pct"
  | "points"
  | "rebounds"
  | "oreb"
  | "dreb"
  | "assists"
  | "steals"
  | "blocks"
  | "turnovers"
  | "assist_turnover";

export type FantasyCategory = {
  key: FantasyCategoryKey;
  label: string;
  percentage?: boolean;
  lowerIsBetter?: boolean;
};

const DEFINITIONS: Record<string, FantasyCategory> = {
  "FG%": { key: "fg_pct", label: "FG%", percentage: true },
  "3PTM": { key: "three_pm", label: "3PM" },
  "3PM": { key: "three_pm", label: "3PM" },
  "FT%": { key: "ft_pct", label: "FT%", percentage: true },
  "PTS": { key: "points", label: "PTS" },
  "REB": { key: "rebounds", label: "REB" },
  "OREB": { key: "oreb", label: "OREB" },
  "DREB": { key: "dreb", label: "DREB" },
  "AST": { key: "assists", label: "AST" },
  "ST": { key: "steals", label: "STL" },
  "STL": { key: "steals", label: "STL" },
  "BLK": { key: "blocks", label: "BLK" },
  "TO": { key: "turnovers", label: "TO", lowerIsBetter: true },
  "A/TO": { key: "assist_turnover", label: "A/TO" },
};

export function resolveFantasyCategories(labels: string[]): FantasyCategory[] {
  return labels
    .map((label) => DEFINITIONS[label.trim().toUpperCase()])
    .filter((category): category is FantasyCategory => Boolean(category));
}

export function fantasyStatValue(
  stats: FantasyPlayerStats | null | undefined,
  category: FantasyCategory,
) {
  const value = stats?.[category.key];
  return typeof value === "number" ? value : null;
}

export function formatFantasyStat(
  stats: FantasyPlayerStats | null | undefined,
  category: FantasyCategory,
) {
  const value = fantasyStatValue(stats, category);
  if (value === null) return "—";
  const formatted = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return category.percentage ? `${formatted}%` : formatted;
}
