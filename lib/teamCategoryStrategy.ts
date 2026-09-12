export type StrategyStance = "target" | "neutral" | "punt";

export type TeamCategoryStrategy = {
  league_slug: "ldl" | "bdb";
  franchise: { id: string; name: string };
  fantasy_season: string;
  version: number | null;
  strategy_applied: boolean;
  target_categories: string[];
  punt_categories: string[];
  categories: Array<{
    key: string;
    display_order: number;
    stance: StrategyStance;
  }>;
  created_at: string | null;
  created_by: { display_name: string } | null;
  write_status?: "created" | "unchanged";
};

export const CATEGORY_LABELS: Record<string, string> = {
  fg_pct: "FG%",
  three_pm: "3PTM",
  ft_pct: "FT%",
  points: "PTS",
  rebounds: "REB",
  oreb: "OREB",
  dreb: "DREB",
  assists: "AST",
  steals: "ST",
  blocks: "BLK",
  turnovers: "TO",
  assist_turnover: "A/TO",
};
