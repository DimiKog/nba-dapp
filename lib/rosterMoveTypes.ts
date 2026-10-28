/** Types matching Team Intelligence roster-move discovery/analysis responses. */

export type RosterMovePairFeasibilityStatus =
  | "feasible"
  | "needs_review"
  | "economically_unverified"
  | "blocked";

export type RosterMoveDiscoveryTier =
  | "tier_1_target_ready"
  | "tier_2_target_needs_review"
  | "tier_3_target_protect_tradeoff"
  | "tier_economically_unverified"
  | "tier_blocked"
  | "tier_other"
  | string;

export interface RosterMoveContributionBasis {
  resolution?: string | null;
  current_season?: string | null;
  previous_season?: string | null;
  current_games?: number | null;
  previous_games?: number | null;
  current_weight?: number | null;
  previous_weight?: number | null;
  [key: string]: unknown;
}

export interface RosterMoveActionability {
  status?: string | null;
  reasons?: string[];
  role_signal?: string | null;
  observed_games?: number | null;
  observed_minutes?: number | null;
  analysis_mode?: string | null;
  [key: string]: unknown;
}

export interface RosterMovePlayerRef {
  nba_id: number;
  name?: string | null;
  salary?: string | number | null;
  discovery_lanes?: string[];
  contribution_basis?: RosterMoveContributionBasis | null;
  resolved_contribution?: Record<string, number | null> | null;
  observed?: { games?: number | null } | null;
  injury?: {
    status?: string | null;
    body_part?: string | null;
    detail?: string | null;
    source?: string | null;
    updated_at?: string | null;
  } | null;
  actionability?: RosterMoveActionability | null;
}

export interface RosterMovePairFeasibility {
  status: RosterMovePairFeasibilityStatus | string;
  reasons?: string[];
  salary_verified?: boolean;
  cap_result?: string | null;
}

export interface RosterMoveMeaningfulTransition {
  key: string;
  classification?: string | null;
  transition?: string | null;
  rank_delta?: number | null;
  z_delta?: number | null;
}

export interface RosterMoveSalaryCapSummary {
  applies?: boolean;
  status?: string | null;
  verified?: boolean | null;
  delta?: number | null;
  cap_result?: string | null;
  after?: unknown;
  salary_in?: number | null;
  salary_out?: number | null;
  reason?: string | null;
}

export interface RosterMoveRecommendation {
  tier: RosterMoveDiscoveryTier;
  pair_feasibility: RosterMovePairFeasibility;
  remove_player: RosterMovePlayerRef;
  add_player: RosterMovePlayerRef;
  target?: {
    improved?: string[];
    declined?: string[];
  };
  protect?: {
    improved?: string[];
    preserved?: string[];
    damaged?: string[];
  };
  flex?: {
    improved?: string[];
    declined?: string[];
  };
  punt_candidate?: {
    improved?: string[];
    declined?: string[];
  };
  meaningful_transitions?: RosterMoveMeaningfulTransition[];
  roster_effect?: Record<string, unknown> | null;
  salary_cap?: RosterMoveSalaryCapSummary | null;
  invented_drop?: boolean;
  reason_codes?: string[];
}

export interface RosterMoveDiscoveryTierPayload {
  count_evaluated?: number;
  returned?: RosterMoveRecommendation[];
}

export interface RosterMoveDiscovery {
  league?: { slug?: string | null; season_phase?: string | null };
  team_id?: string;
  basis_requested?: string;
  basis_used?: string;
  window?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
  before_profile?: Record<string, unknown> | null;
  recommended_strategy?: Record<string, unknown> | null;
  protect_categories?: string[];
  fa_shortlist?: RosterMovePlayerRef[];
  discovery_heuristics?: Record<string, unknown>;
  pair_stats?: Record<string, unknown>;
  tiers: Record<string, RosterMoveDiscoveryTierPayload>;
  method?: Record<string, unknown>;
}

export interface RosterMoveAnalysisCategoryImpact {
  key: string;
  label?: string | null;
  classification?: string | null;
  before?: {
    value?: number | null;
    league_rank?: number | null;
    eligible_teams?: number | null;
    percentile?: number | null;
    z?: number | null;
    verdict?: string | null;
  };
  after?: {
    value?: number | null;
    league_rank?: number | null;
    eligible_teams?: number | null;
    percentile?: number | null;
    z?: number | null;
    verdict?: string | null;
  };
  value_delta?: number | null;
  rank_delta?: number | null;
  z_delta?: number | null;
  transition?: string | null;
  reason_codes?: string[];
}

export interface RosterMoveAnalysis {
  league?: Record<string, unknown>;
  team_id?: string;
  basis_requested?: string;
  basis_used?: string;
  window?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
  move?: {
    removed?: RosterMovePlayerRef[];
    added?: RosterMovePlayerRef[];
    invented_drop?: boolean;
  };
  before_profile?: Record<string, unknown> | null;
  recommended_strategy?: Record<string, unknown> | null;
  category_impact?: RosterMoveAnalysisCategoryImpact[];
  strategic_impact?: {
    target?: { improved?: string[]; declined?: string[]; unchanged?: string[] };
    protect?: {
      improved?: string[];
      preserved?: string[];
      damaged?: string[];
    };
    flex?: { improved?: string[]; declined?: string[]; unchanged?: string[] };
    punt_candidate?: {
      improved?: string[];
      declined?: string[];
      unchanged?: string[];
    };
    tradeoff?: { gains?: string[]; costs?: string[] };
    flags?: string[];
  };
  roster_effect?: Record<string, unknown> | null;
  salary_cap?: Record<string, unknown> | null;
  availability?: { added?: RosterMovePlayerRef["injury"] };
  actionability?: { added?: RosterMoveActionability | null };
  method?: Record<string, unknown>;
  reason_codes?: string[];
}

export interface RosterMoveDiscoveryRequest {
  basis?: "season";
  focus_categories?: string[];
  actionable_only?: boolean;
  max_unique_fas?: number;
  max_results?: number;
}

export interface RosterMoveAnalysisRequest {
  remove_nba_id: number;
  add_nba_id: number;
  basis?: "season";
}
