const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

export class ApiResponseError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiResponseError";
  }
}

export interface Player {
  id: number;
  name: string;
  position: string | null;
  team: string | null;
  photo: string | null;
  nba_id: number | null;
  salary_current: string | null;
}

export interface Contract {
  "2024-25": string | null;
  "2025-26": string | null;
  "2026-27": string | null;
  "2027-28": string | null;
  "2028-29": string | null;
  "2029-30": string | null;
  "2030-31": string | null;
  guaranteed: string | null;
  retrieved_at: string | null;
}

export interface PlayerDetail extends Player {
  birth_date: string | null;
  contract: Contract;
}

export interface PlayerIntelligenceCategory {
  key: string;
  label: string;
  value: number | null;
  z: number | null;
  nba_rank: number | null;
  nba_of: number | null;
  fantasy_market_rank: number | null;
  fantasy_market_of: number | null;
}

export interface PlayerIntelligenceSample {
  categories: PlayerIntelligenceCategory[];
  games: number;
  minimum_games: number;
  qualified: boolean;
  sample: string;
  strengths: string[];
  weaknesses: string[];
  overall?: {
    z_score: number;
    nba_rank: number | null;
    nba_of: number | null;
    fantasy_market_rank: number | null;
    fantasy_market_of: number | null;
  } | null;
}

export interface PlayerIntelligence {
  categories: { key: string; label: string }[];
  generated_at: string;
  source: string;
  window: { days: number; season: string };
  freshness: { injury: string | null; roster: string | null; stats: string | null };
  league?: FantasyLeague & { categories: string[] };
  player: {
    player_id: number;
    nba_id: number | null;
    name: string;
    short_name: string;
    position: string | null;
    nba_team: string | null;
    nba_team_short: string | null;
    photo: string | null;
    identity_status: "resolved" | "unresolved";
    status: string | null;
    availability?: "free_agent" | "rostered";
    fantasy_team: { id: string; name: string; logo: string | null; owner: string | null } | null;
    injury: { status: string; body_part: string | null; detail: string | null; source: string; updated_at: string | null } | null;
    latest_game: {
      date: string; game_id: string; is_home: boolean; minutes: number | null; opponent: string; team: string;
      stats: { points: number; oreb: number; dreb: number; assists: number; steals: number; blocks: number; turnovers: number; three_pm: number; fgm: number; fga: number; ftm: number; fta: number };
    } | null;
    salaries: Record<string, string | null>;
    salary_2026_27: string | null;
    season_average: FantasyPlayerStats;
    window_stats: FantasyPlayerStats;
    season_average_intelligence: PlayerIntelligenceSample;
    window_stats_intelligence: PlayerIntelligenceSample;
  };
}

export function photoUrl(filename: string | null, nbaId?: number | null): string | null {
  if (filename && /^https?:\/\//i.test(filename)) return filename;
  if (filename) return `${BASE}/photos/${filename}`;
  if (nbaId) return `${BASE}/photos/${nbaId}.png`;
  return null;
}

export async function fetchPlayers(search?: string): Promise<Player[]> {
  const url = search
    ? `${BASE}/api/nba/players/search?q=${encodeURIComponent(search)}`
    : `${BASE}/api/nba/players`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
}

export async function fetchPlayer(id: number): Promise<PlayerDetail> {
  const res = await fetch(`${BASE}/api/nba/players/${id}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new ApiResponseError("Player unavailable", res.status);
  return res.json();
}

export async function fetchPlayerIntelligence(
  playerId: number,
  options: { league?: "ldl" | "bdb"; nbaId?: number | null; window?: number } = {},
): Promise<PlayerIntelligence> {
  const window = options.window ?? 14;
  const path = options.league && options.nbaId
    ? `/api/fantasy/${options.league}/players/${options.nbaId}/intelligence`
    : `/api/nba/players/${playerId}/intelligence`;
  const res = await fetch(`${BASE}${path}?window=${window}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Player intelligence unavailable");
  return res.json();
}

// ── Fantasy ──────────────────────────────────────────────────────────────────

export interface FantasyTeam {
  team_id: string;
  name: string;
  short_name: string;
  logo: string | null;
  rank: number | null;
  wins: number | null;
  losses: number | null;
  ties: number | null;
  points_for: number | null;
  points_against: number | null;
  cap_season: string | null;
  cap_status: "over" | "under" | "at_cap" | "cap_unavailable";
  cap_difference: number | null;
}

export interface FantasyPlayer {
  player_id: number | null;
  fantrax_scorer_id: string | null;
  name: string;
  short_name: string;
  nba_team: string;
  nba_team_short: string;
  position: string;
  status: "Active" | "Reserve" | "IR" | "Free Agent" | "?";
  photo: string | null;
  nba_id: number | null;
  salary_2026_27: string | null;
  salaries?: {
    "2026-27": string | null;
    "2027-28": string | null;
    "2028-29": string | null;
    "2029-30": string | null;
    "2030-31": string | null;
  };
  injury: string | null;
}

export interface FantasyRoster {
  team_id: string;
  team_name: string;
  logo: string | null;
  owner: string | null;
  players: FantasyPlayer[];
}

export interface FantasyPlayerStats {
  games: number;
  minutes?: number | null;
  fg_pct: number | null;
  three_pm: number;
  ft_pct: number | null;
  points: number;
  rebounds?: number;
  oreb: number;
  dreb: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  assist_turnover: number | null;
  fgm?: number;
  fga?: number;
  ftm?: number;
  fta?: number;
}

export interface FantasyPlayerPerformance extends Omit<FantasyPlayer, "injury"> {
  identity_status: "resolved" | "unresolved";
  availability?: "free_agent" | "rostered";
  availability_rank?: number | null;
  availability_of?: number | null;
  nba_relevance?: "current_or_recent" | "legacy_only";
  nba_relevance_evidence?: Array<"current_team" | "current_salary" | "recent_performance">;
  tenure?: {
    fantasy_season: string;
    year: number;
    exact: boolean;
    minimum: number | null;
    franchise_player: boolean;
    status: "normal" | "final_legal_year" | "franchise_exempt" | "tenure_expired_free_agent";
    canonical_roster: boolean;
  } | null;
  fantasy_team?: {
    id: string;
    name: string;
    logo: string | null;
    owner: string | null;
  } | null;
  injury: {
    status: string;
    body_part: string | null;
    detail: string | null;
    source: string;
    updated_at: string | null;
  } | null;
  latest_game: {
    date: string;
    game_id: string;
    team: string;
    opponent: string;
    is_home: boolean;
    minutes: number | null;
    stats: Omit<FantasyPlayerStats, "games" | "fg_pct" | "ft_pct" | "assist_turnover"> & {
      fgm: number;
      fga: number;
      ftm: number;
      fta: number;
    };
  } | null;
  window_stats: FantasyPlayerStats;
  season_average: FantasyPlayerStats | null;
  category_strengths: string[];
  impact_rank: number | null;
  impact_score: number | null;
  freshness: {
    roster: string | null;
    stats: string | null;
    injury: string | null;
  };
}

export interface FantasyRosterPerformance {
  league: FantasyLeague;
  team: {
    id: string;
    name: string;
    logo: string | null;
    owner: string | null;
    claim_budget?: {
      remaining: number;
      source: string;
    };
  };
  window: {
    days: number;
    from: string;
    to: string;
    season: string;
  };
  categories: string[];
  ranking_method: string;
  payroll?: {
    includes_statuses: Array<"Active" | "Reserve" | "IR">;
    seasons: Array<{
      season: string;
      total: number;
      known_players: number;
      free_agents: number;
      cap: number | null;
      remaining: number | null;
      status: "under" | "over" | "cap_unavailable";
      cap_provisional: boolean | null;
    }>;
  };
  players: FantasyPlayerPerformance[];
}

export type FantasySeasonPhase = "in_season" | "off_season";
export type TradeBasis = "season" | "window";

export interface TradePlayerSummary {
  nba_id: number;
  name: string;
  position: string | null;
  nba_team: string | null;
  fantasy_team: {
    id: string;
    name: string;
    logo: string | null;
    owner: string | null;
  } | null;
  injury: FantasyPlayerPerformance["injury"];
  salaries: Record<string, number | null>;
}

export interface TradePayrollSeasonState {
  season: string;
  total: number;
  known_players: number;
  free_agents: number;
  cap: number | null;
  remaining: number | null;
  status: "under" | "over" | "cap_unavailable";
  cap_provisional: boolean | null;
}

export interface TradePayrollSeason {
  season: string;
  before: TradePayrollSeasonState;
  after: TradePayrollSeasonState;
  delta: number;
}

export type TradeCapResult =
  | "unknown"
  | "compliant"
  | "not_cap_compliant"
  | "requires_additional_move"
  | "clears_cap"
  | "moves_toward_cap"
  | "moves_away_from_cap"
  | "crosses_over"
  | "remains_under";

export interface TradePayrollComparison {
  seasons: TradePayrollSeason[];
  current_cap_result: TradeCapResult;
}

export interface TradeCategoryChange {
  key: string;
  label: string;
  before: FantasyTeamCategory;
  after: FantasyTeamCategory;
  value_delta: number | null;
  rank_delta: number | null;
  z_delta: number | null;
  transition: "unchanged" | "weakness_resolved" | "new_weakness" | "improved" | "declined";
}

export interface TradeTeamResult {
  team: { id: string; name: string; logo: string | null; owner: string | null };
  before: {
    categories: FantasyTeamCategory[];
    weaknesses: string[];
    strengths: string[];
    severe_weaknesses: string[];
  };
  after: {
    categories: FantasyTeamCategory[];
    weaknesses: string[];
    strengths: string[];
    severe_weaknesses: string[];
  };
  category_changes: TradeCategoryChange[];
  payroll: TradePayrollComparison;
}

export interface TradeWarning {
  key: string;
  name?: string;
  player?: string;
  team?: string;
  result?: TradeCapResult;
  remaining_overage?: number | null;
  return_salary_not_included?: boolean;
}

export interface FantasyTradeAnalysis {
  league: FantasyLeague;
  basis_requested: TradeBasis;
  basis_used: TradeBasis;
  fallback_reason: string | null;
  season_phase: FantasySeasonPhase;
  trade: {
    outgoing: TradePlayerSummary;
    incoming: TradePlayerSummary;
    selected_team_id: string;
    counterparty_team_id: string;
  };
  selected_team: TradeTeamResult;
  counterparty_team: TradeTeamResult;
  verdict: {
    key: "likely_improvement" | "mixed" | "likely_decline" | "not_cap_compliant" | "insufficient_data";
    headline: string;
    confidence: "high" | "low";
    reasons: Array<{ category: string; transition: string; z_delta: number | null; rank_delta: number | null }>;
    warnings: TradeWarning[];
  };
}

export interface TradePartner {
  rank: number;
  team: { id: string; name: string; logo: string | null; owner: string | null };
  fit_score: number;
  approach_score: number;
  reason: string;
  confidence: "high" | "medium" | "low";
  helps: string[];
  harms: string[];
  category_changes: TradeCategoryChange[];
  payroll: TradePayrollComparison;
  cap_screen: { result: TradeCapResult; return_salary_not_included: true };
  warnings: TradeWarning[];
}

export interface FantasyTradePartners {
  league: FantasyLeague;
  basis_requested: TradeBasis;
  basis_used: TradeBasis;
  fallback_reason: string | null;
  season_phase: FantasySeasonPhase;
  selected_team_id: string;
  outgoing: TradePlayerSummary;
  selected_team_payroll_after_removal: TradePayrollComparison;
  partners: TradePartner[];
  total_partners: number;
  warnings: TradeWarning[];
}

export type DraftPickValueTier =
  | "premium"
  | "strong"
  | "useful"
  | "secondary"
  | "minor"
  | "fringe";

export interface TradeSuggestionPickOption {
  id: number;
  draft_year: number;
  round: number;
  original_franchise: { id: string; name: string } | null;
  current_owner: { id: string; name: string } | null;
  valuation: {
    status: "shadow";
    compensation_band: {
      conservative: DraftPickValueTier;
      optimistic: DraftPickValueTier;
    };
    confidence?: { order?: "high" | "low"; market?: "high" | "low" };
    draft_pool?: "rookie_only" | "all_available_free_agents" | "unknown";
  };
  assessment: {
    status: "shadow";
    sufficiency:
      | "fully_compensated"
      | "minimum_compensation_met"
      | "plausible_only"
      | "insufficient"
      | "unavailable";
    reason: string;
    minimum_requirement_met?: boolean;
    full_range_met?: boolean;
    optimistic_minimum_met?: boolean;
  };
}

export interface TradeSuggestionPickCompensation {
  status:
    | "not_required"
    | "possible_options"
    | "options_below_requirement"
    | "unavailable";
  reason: string;
  affects_recommendations: false;
  recommendation_effect: "none_shadow_only";
  automatic_selection: false;
  direction: "counterparty_to_selected" | "selected_to_counterparty" | null;
  giving_team_id?: string;
  receiving_team_id?: string;
  giving_franchise_id?: string;
  player_gap: {
    status: "shadow" | "valuation_unavailable";
    gap_band?: "small" | "moderate" | "major" | "exceptional";
    required_pick_compensation?: {
      conservative: DraftPickValueTier;
      optimistic: DraftPickValueTier;
    };
  } | null;
  candidate_options: TradeSuggestionPickOption[];
  options_returned?: number;
  options_considered?: number;
}

export interface BalancedTradeSuggestion {
  rank_within_team: number;
  suggestion_tier: "proposable" | "exploratory";
  trade: {
    outgoing: TradePlayerSummary;
    incoming: TradePlayerSummary;
    selected_team_id: string;
    counterparty_team_id: string;
  };
  selected_category_score: number;
  selected_team: {
    team: { id: string; name: string; logo: string | null; owner: string | null };
    category_changes: TradeCategoryChange[];
    payroll: TradePayrollComparison;
  };
  counterparty_team: {
    team: { id: string; name: string; logo: string | null; owner: string | null };
    category_changes: TradeCategoryChange[];
    payroll: TradePayrollComparison;
  };
  acceptance: {
    status: "positive" | "neutral" | "negative" | "blocked";
    score: number;
    reason: string;
  };
  production_value: TradePackageProductionValue & {
    recommendation?:
      | "player_only_balanced"
      | "replacement_level_value_indeterminate"
      | "additional_assets_required"
      | "not_recommended_player_only"
      | "value_unavailable";
  };
  qualification?: {
    strict_proposal: boolean;
    gates: {
      selected_team_category_fit: {
        passed: boolean;
        score: number;
        reason: string;
      };
      counterparty_acceptance: {
        passed: boolean;
        status: "positive" | "neutral" | "negative" | "blocked";
        score: number;
        reason: string;
      };
      production_value_balance: {
        passed: boolean;
        classification: TradePackageProductionValue["classification"];
        reason: string;
      };
    };
    exploratory_reasons: string[];
  };
  pick_compensation?: TradeSuggestionPickCompensation;
  cap_legality: {
    selected_team: TradeSuggestionCapStatus;
    counterparty_team: TradeSuggestionCapStatus;
  };
  salary_movement: { delta: number; salary_added: number; salary_saved: number };
  outcomes: {
    selected_team: { helps: string[]; harms: string[]; cap_movement: number | null };
    counterparty_team: { helps: string[]; harms: string[]; acceptance_reason: string };
  };
  confidence: "high" | "medium" | "low";
  warnings: TradeWarning[];
  strategy_applied: false;
}

export interface FantasyBalancedTradeSuggestions {
  league: FantasyLeague;
  basis_requested: TradeBasis;
  basis_used: TradeBasis;
  fallback_reason: string | null;
  season_phase: FantasySeasonPhase;
  selected_team_id: string;
  outgoing: TradePlayerSummary;
  intent: "balanced";
  strategy_applied: false;
  counts: { proposable: number; exploratory: number; returned: number };
  closest_alternatives?: {
    selection_method: "fewest_failed_gates_then_existing_deterministic_order";
    scope: "returned_exploratory_suggestions";
    total_considered: number;
    excluded_not_safe: number;
    returned: number;
    items: Array<{
      counterparty_team_id: string;
      incoming_nba_id: number | null;
      classification: "one_check_short" | "needs_changes";
      passed_gate_count: number;
      failed_gate_count: number;
      failed_gates: Array<
        | "selected_team_category_fit"
        | "counterparty_acceptance"
        | "production_value_balance"
      >;
      primary_blocker: {
        gate:
          | "selected_team_category_fit"
          | "counterparty_acceptance"
          | "production_value_balance";
        reason: string;
      };
      suggested_action: {
        type:
          | "review_category_tradeoff"
          | "improve_partner_return"
          | "additional_compensation"
          | "restructure_package";
        pick_guidance: TradeSuggestionPickCompensation["status"] | null;
      };
    }>;
  };
  teams: Array<{
    team: { id: string; name: string; logo: string | null; owner: string | null };
    counts: { proposable: number; exploratory: number; returned: number };
    suggestions: BalancedTradeSuggestion[];
  }>;
  diagnostics: {
    candidate_pairs: number;
    eligible_pairs: number;
    excluded: Record<string, number>;
    warnings?: Record<string, number>;
    outgoing_player?: {
      status: "eligible" | "missing_statistics";
      blocking_reason: "outgoing_player_missing_statistics" | null;
    };
    strict_gate_counts?: {
      eligible_after_hard_filters: number;
      selected_team_category_fit: number;
      counterparty_acceptance: number;
      production_value_balance: number;
      all_strict_gates: number;
    };
    production_value_classifications?: Record<string, number>;
    messages: string[];
    safe_next_steps: Array<{ key: string; message: string }>;
  };
  production_value_warning?: string | null;
}

export interface TradeSuggestionCapStatus {
  eligible: boolean;
  reason: string;
  movement: number | null;
  before_total?: number;
  after_total?: number;
  cap?: number;
  remaining_before?: number;
  remaining_after?: number;
  amount_to_clear?: number;
  compliance_required?: boolean;
  compliance_deadline?: "cap_activation_in_october" | string | null;
  hard_gate_applied?: boolean;
}

export type TradePackageCompletionStatus =
  | "legal_as_proposed"
  | "legal_with_drop"
  | "legal_as_expanded_package"
  | "roster_rules_unknown"
  | "illegal";

export interface TradePackageCategoryScore {
  score: number;
  helps?: string[];
  harms?: string[];
}

export interface TradePackageRosterLegality {
  status: "legal" | "illegal" | "unknown";
  reason: string;
  before: number;
  after: number;
  minimum: number | null;
  standard_maximum: number | null;
  applicable_maximum: number | null;
}

export interface TradePackageCapLegality {
  eligible: boolean;
  reason: string;
  movement?: number | null;
}

export interface TradeProductionValueContribution {
  nba_id: number;
  name: string | null;
  impact: number | null;
  surplus: number | null;
}

export interface TradeTeamProductionValue {
  sent: number | null;
  received: number | null;
  delta: number | null;
  retained_ratio: number | null;
  classification: "balanced" | "materially_equivalent" | "uneven" | "severely_uneven" | "unknown";
  reason: string;
  value_gap_to_balanced: number | null;
  contributions: {
    sent: TradeProductionValueContribution[];
    received: TradeProductionValueContribution[];
  };
}

export interface TradePackageProductionValue {
  basis: string | null;
  basis_used?: TradeBasis;
  replacement_impact: number | null;
  selected_team: TradeTeamProductionValue;
  counterparty_team: TradeTeamProductionValue;
  classification: "balanced" | "materially_equivalent" | "uneven" | "severely_uneven" | "unknown";
  reason?: string;
  worst_side_ratio: number | null;
  compensation_required: boolean;
  compensation_reason?: string | null;
  thresholds: {
    balanced: number;
    severely_uneven: number;
  };
}

export interface TradePackageCompletionOption {
  type: "drop" | "expanded_package";
  completion_status: TradePackageCompletionStatus;
  player: TradePlayerSummary;
  team: "selected_team" | "counterparty_team";
  recommendation_tier: "proposable" | "exploratory" | "not_recommended";
  production_value: TradePackageProductionValue;
  marginal_value_lost: number | null;
  selected_category_score: TradePackageCategoryScore;
  counterparty_acceptance: {
    status: "positive" | "neutral" | "negative" | "blocked";
    score: number;
    reason: string;
  };
  cap_legality: {
    selected_team: TradePackageCapLegality;
    counterparty_team: TradePackageCapLegality;
  };
  roster_legality: {
    selected_team: TradePackageRosterLegality;
    counterparty_team: TradePackageRosterLegality;
  };
}

export interface AutomaticTradePackageSuggestion {
  league: FantasyLeague;
  basis_requested: TradeBasis;
  basis_used: TradeBasis;
  fallback_reason: string | null;
  season_phase: FantasySeasonPhase;
  completion_status: TradePackageCompletionStatus;
  requires_roster_action: boolean;
  recommendation_tier: "proposable" | "exploratory" | "not_recommended";
  production_value: TradePackageProductionValue;
  best_completion?: TradePackageCompletionOption;
  package: {
    selected_team_sends: TradePlayerSummary[];
    counterparty_team_sends: TradePlayerSummary[];
    drops: { selected_team: TradePlayerSummary | null; counterparty_team: TradePlayerSummary | null };
    assets: unknown[];
  };
  selected_team: TradeTeamResult & {
    roster_slots: TradePackageRosterLegality;
    cap_legality: TradePackageCapLegality;
    category_score: TradePackageCategoryScore;
  };
  counterparty_team: TradeTeamResult & {
    roster_slots: TradePackageRosterLegality;
    cap_legality: TradePackageCapLegality;
    acceptance: {
      status: "positive" | "neutral" | "negative" | "blocked";
      score: number;
      reason: string;
    };
  };
  completion_options: {
    generated: boolean;
    eligible_drop_candidates: number;
    eligible_expansion_candidates: number;
    drop_candidates: TradePackageCompletionOption[];
    expanded_packages: TradePackageCompletionOption[];
    excluded: Record<string, number>;
  };
  verdict: FantasyTradeAnalysis["verdict"];
  warnings: TradeWarning[];
}

export interface FantasyAutomaticTradePackageSuggestions {
  league: FantasyLeague;
  selected_team_id: string;
  outgoing_player: TradePlayerSummary;
  intent: "balanced";
  basis_requested: TradeBasis;
  basis_used: TradeBasis;
  fallback_reason: string | null;
  suggestions: AutomaticTradePackageSuggestion[];
  summary: {
    screened_pairs: number;
    balanced_candidates: number;
    exact_candidates_checked: number;
    returned: number;
    proposable: number;
    exploratory: number;
    diagnostics: Record<string, number>;
  };
  performance: {
    exhaustive_compute_seconds: number;
    load_and_exact_hydration_seconds: number;
  };
  method: {
    scope: string;
    category_aggregation: string;
    unequal_package_scoring: string;
    completion_hydration: string;
    strategy_applied: false;
  };
}

export interface ResolvedTradePickAsset {
  type: "draft_pick";
  pick_id: number;
  from_team: "selected_team" | "counterparty_team";
  to_team: "selected_team" | "counterparty_team";
  draft_year: number;
  round: number;
  original_franchise: { id: string; name: string } | null;
  current_owner: { id: string; name: string } | null;
  eligibility: { eligible: boolean; reason?: string };
  valuation: {
    status: "shadow";
    compensation_band: { conservative: DraftPickValueTier; optimistic: DraftPickValueTier };
  } | null;
  valuation_unavailable_reason?: string | null;
}

export interface ExplicitPickSideAssessment {
  status: "no_pick_received" | "valuation_unavailable" | "player_gap_unavailable" | "additional_future_value" | "assessed";
  incoming_assets: ResolvedTradePickAsset[];
  combined_valuation: {
    compensation_band: { conservative: DraftPickValueTier; optimistic: DraftPickValueTier };
    [key: string]: unknown;
  } | null;
  player_gap: TradeSuggestionPickCompensation["player_gap"];
  assessment: {
    sufficiency: "fully_compensated" | "minimum_compensation_met" | "plausible_only" | "insufficient" | "unavailable" | "not_required";
    reason: string;
  } | null;
}

export interface FantasyTradePackageAnalysis extends AutomaticTradePackageSuggestion {
  package: AutomaticTradePackageSuggestion["package"] & {
    assets: ResolvedTradePickAsset[];
  };
  pick_value?: {
    status: "not_present" | "shadow";
    affects_recommendations: false;
    recommendation_effect: "none_shadow_only";
    automatic_selection: false;
    selected_team: ExplicitPickSideAssessment;
    counterparty_team: ExplicitPickSideAssessment;
  };
}

export type FantasyCategoryVerdict =
  | "strength"
  | "neutral"
  | "weakness"
  | "insufficient_data";

export interface FantasyTeamCategory {
  key: string;
  label: string;
  value: number | null;
  league_rank: number | null;
  eligible_teams: number;
  percentile: number | null;
  league_mean: number | null;
  z: number | null;
  verdict: FantasyCategoryVerdict;
  sample: {
    makes?: number;
    attempts?: number;
    assists?: number;
    turnovers?: number;
  } | null;
}

export interface FantasyTeamCategoryProfile {
  league: FantasyLeague;
  team: {
    id: string;
    name: string;
    logo: string | null;
    owner: string | null;
  };
  basis_requested: "season" | "window";
  basis_used: "season" | "window";
  scope: "roster_rate";
  window: {
    days: number;
    from: string;
    to: string;
    season: string;
  };
  snapshot: {
    captured_at: string | null;
    generated_at: string;
    source: "database_cache";
  };
  sample: {
    league_teams: number;
    players_included: number;
    players_missing_stats: number;
    league_players_included: {
      minimum: number;
      maximum: number;
      average: number;
    };
  };
  categories: FantasyTeamCategory[];
  weaknesses: string[];
  strengths: string[];
  severe_weaknesses: string[];
  method: {
    ranking: string;
    ratios: string;
    turnovers: string;
    window_scope: string;
  };
}

export interface FantasyCategoryNeed {
  key: string;
  label: string;
  of: number;
  team_rank: number | null;
  team_z: number | null;
  weight: number;
}

export interface FantasyTargetCandidate {
  player_id: number | null;
  nba_id: number;
  name: string;
  short_name: string;
  nba_team: string;
  nba_team_short: string;
  position: string;
  photo: string | null;
  availability: "free_agent" | "rostered";
  fantasy_team: {
    id?: string;
    team_id?: string;
    name: string;
    logo?: string | null;
  } | null;
  fit_rank: number;
  fit_score: number;
  confidence: "high" | "medium" | "low";
  availability_rank?: number;
  availability_of?: number;
  availability_percentile?: number;
  recommendation_tier?: "strong" | "best_available" | "last_resort" | "not_recommended";
  recommendation_labels?: string[];
  helps: string[];
  hurts_needs: string[];
  tradeoffs: string[];
  need_contributions?: Array<{
    key: string;
    label: string;
    player_z: number;
    absolute_z?: number;
    weight: number;
    weighted_contribution: number;
    verdict: string;
    availability_rank?: number;
    availability_of?: number;
    availability_percentile?: number;
  }>;
  salary_2026_27: string | null;
  salaries?: Record<string, string | null>;
  injury: string | {
    body_part?: string | null;
    detail?: string | null;
    source?: string | null;
    status?: string | null;
    updated_at?: string | null;
  } | null;
}

export interface FantasyCategoryRecommendation {
  key: string;
  label: string;
  free_agent_market: "strong" | "limited" | "weak" | "no_qualifying_options";
  message: string | null;
  strong_free_agents: FantasyTargetCandidate[];
  best_available: FantasyTargetCandidate[];
  trade_targets: FantasyTargetCandidate[];
  last_resort: FantasyTargetCandidate[];
}

export interface FantasyCategoryTargets {
  league: FantasyLeague & { categories?: string[] };
  team: {
    id: string;
    name: string;
    logo: string | null;
    owner: string | null;
  };
  basis_requested: "season" | "window";
  basis_used: "season" | "window";
  fallback_reason: string | null;
  window: {
    days: number;
    from: string;
    to: string;
    season: string;
  };
  need_source: "profile_weaknesses" | "relative_lowest" | "user_selected_category";
  needs: FantasyCategoryNeed[];
  sample: {
    candidate_universe: number;
    eligible_candidates: number;
    filtered_candidates: number;
    returned: number;
  };
  filters: {
    availability: "all" | "free_agent" | "rostered";
    position: string | null;
    limit: number;
  };
  candidates: FantasyTargetCandidate[];
  category_recommendations?: FantasyCategoryRecommendation[];
}

export interface LeaguePlayerExplorer {
  league: FantasyLeague;
  snapshot: {
    captured_at: string | null;
    generated_at: string;
    source: "database_cache";
  };
  window: {
    days: number;
    from: string;
    to: string;
    season: string;
  };
  categories: string[];
  ranking_method: string;
  ranking_basis: "window" | "season";
  availability_basis: "latest_league_roster_snapshots";
  counts: {
    total: number;
    rostered: number;
    free_agents: number;
    free_agents_ranked: number;
    free_agents_current_or_recent: number;
    free_agents_legacy_only: number;
    ranked: number;
  };
  nba_relevance_basis: {
    classification: "current_or_recent_evidence";
    contract_season: string;
    performance_season: string;
    evidence: Array<"current_team" | "current_salary" | "recent_performance">;
    legacy_only_means: string;
  };
  teams: Array<{
    id: string;
    name: string;
    logo: string | null;
    owner: string | null;
  }>;
  players: FantasyPlayerPerformance[];
}

export interface FantasyCategoryTrend {
  recent: number | null;
  season: number | null;
  delta: number | null;
  improved: boolean | null;
}

export interface FantasyRadarPlayer extends FantasyPlayerPerformance {
  availability?: "rostered" | "free_agent";
  recent_average: FantasyPlayerStats;
  trend_score: number | null;
  trend_rank: number | null;
  trend_strengths: string[];
  trend_confidence: "high" | "medium" | "insufficient_sample";
  category_trends: Record<string, FantasyCategoryTrend>;
}

export interface FantasyFreeAgentRadar {
  league: FantasyLeague;
  generated_at: string;
  source: "database_cache";
  window: {
    days: number;
    from: string;
    to: string;
    season: string;
  };
  minimum_games: number;
  categories: string[];
  method: string;
  players: FantasyRadarPlayer[];
}

export interface FantasyWatchlistEntry {
  id: number;
  owner_subject: string;
  league_slug: string;
  nba_player_id: number;
  notes: string;
  priority: 1 | 2 | 3;
  created_at: string;
  updated_at: string;
  resolved: boolean;
  player: (FantasyPlayerPerformance & {
    availability: "rostered" | "free_agent";
    category_trends: Record<string, FantasyCategoryTrend>;
  }) | null;
}

export interface FantasyWatchlist {
  league: FantasyLeague;
  owner: string;
  window_days: number;
  categories: string[];
  entries: FantasyWatchlistEntry[];
}

export interface FantasyLeague {
  slug: string;
  name: string;
  league_id: string;
  personal_team_id: string;
  personal_team_name: string;
  enabled: boolean;
  season_phase?: FantasySeasonPhase;
  roster_rules?: {
    minimum_players?: number;
    standard_maximum?: number;
  } | null;
}

export interface MatchupTeam {
  id: string;
  name: string;
  logoUrl128?: string | null;
  isMyTeam?: boolean;
}

export interface MatchupCategory {
  id: string;
  name: string;
  short_name: string;
  sort_direction: 1 | -1;
  away_result_points: number | null;
  home_result_points: number | null;
}

export interface FantasyMatchup {
  matchup_id: string;
  matchup_code: string | null;
  away_team: MatchupTeam;
  home_team: MatchupTeam;
  away_record: [number, number, number] | null;
  home_record: [number, number, number] | null;
  categories: MatchupCategory[];
}

export interface FantasyMatchupPeriod {
  league: FantasyLeague;
  team_id: string;
  period: {
    number: number;
    caption: string;
    date_range: string;
    is_playoffs: boolean;
  };
  categories: Omit<MatchupCategory, "away_result_points" | "home_result_points">[];
  matchups: FantasyMatchup[];
}

export async function fetchFantasyStandings(league: "ldl" | "bdb"): Promise<FantasyTeam[]> {
  const res = await fetch(`${BASE}/api/fantasy/${league}/standings`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Failed to fetch standings");
  return res.json();
}

export async function fetchFantasyRoster(league: "ldl" | "bdb", teamId: string): Promise<FantasyRoster> {
  const res = await fetch(`${BASE}/api/fantasy/${league}/roster/${teamId}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Failed to fetch roster");
  return res.json();
}

export async function fetchFantasyRosterPerformance(
  league: string,
  teamId: string,
  window = 7,
): Promise<FantasyRosterPerformance> {
  const res = await fetch(
    `${BASE}/api/fantasy/${league}/roster/${encodeURIComponent(teamId)}/performance?window=${window}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error("Failed to fetch roster performance");
  return res.json();
}

export async function fetchFantasyTeamCategoryProfile(
  league: "ldl" | "bdb",
  teamId: string,
  basis: "season" | "window" = "season",
  window = 14,
): Promise<FantasyTeamCategoryProfile> {
  const params = new URLSearchParams({
    basis,
    scope: "roster_rate",
    window: String(window),
  });
  const res = await fetch(
    `${BASE}/api/fantasy/${league}/roster/${encodeURIComponent(teamId)}/category-profile?${params}`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) throw new Error("Failed to fetch team category profile");
  return res.json();
}

export async function fetchFantasyCategoryTargets(
  league: "ldl" | "bdb",
  teamId: string,
  options: {
    basis?: "season" | "window";
    window?: number;
    availability?: "all" | "free_agent" | "rostered";
    position?: string;
    category?: string;
    limit?: number;
  } = {},
  identityHeaders?: HeadersInit,
): Promise<FantasyCategoryTargets> {
  const params = new URLSearchParams({
    basis: options.basis ?? "season",
    window: String(options.window ?? 14),
    availability: options.availability ?? "all",
    limit: String(options.limit ?? 24),
  });
  if (options.position) params.set("position", options.position);
  if (options.category) params.set("category", options.category);
  const res = await fetch(
    `${BASE}/api/fantasy/${league}/roster/${encodeURIComponent(teamId)}/targets?${params}`,
    { cache: "no-store", headers: identityHeaders },
  );
  if (!res.ok) throw new Error("Failed to fetch category targets");
  return res.json();
}

export async function fetchFantasyTradeAnalysis(
  league: "ldl" | "bdb",
  teamId: string,
  outgoingNbaId: number,
  incomingNbaId: number,
  basis: TradeBasis = "season",
  window = 14,
): Promise<FantasyTradeAnalysis> {
  const params = new URLSearchParams({
    outgoing_nba_id: String(outgoingNbaId),
    incoming_nba_id: String(incomingNbaId),
    basis,
    window: String(window),
  });
  const res = await fetch(
    `/api/fantasy/${league}/roster/${encodeURIComponent(teamId)}/trade-analysis?${params}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiResponseError(payload?.error ?? "Trade analysis failed", res.status);
  }
  return res.json();
}

export async function fetchFantasyTradePartners(
  league: "ldl" | "bdb",
  teamId: string,
  outgoingNbaId: number,
  basis: TradeBasis = "season",
  window = 14,
  limit = 20,
): Promise<FantasyTradePartners> {
  const params = new URLSearchParams({
    outgoing_nba_id: String(outgoingNbaId),
    basis,
    window: String(window),
    limit: String(limit),
  });
  const res = await fetch(
    `/api/fantasy/${league}/roster/${encodeURIComponent(teamId)}/trade-partners?${params}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiResponseError(payload?.error ?? "Trade partner ranking failed", res.status);
  }
  return res.json();
}

export async function fetchBalancedTradeSuggestions(
  league: "ldl" | "bdb",
  teamId: string,
  outgoingNbaId: number,
  basis: TradeBasis = "season",
  windowDays = 14,
  limitPerTeam = 3,
): Promise<FantasyBalancedTradeSuggestions> {
  const res = await fetch(`/api/fantasy/${league}/trade-suggestions`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selected_team_id: teamId,
      outgoing_player_id: outgoingNbaId,
      intent: "balanced",
      basis,
      window_days: windowDays,
      limit_per_team: limitPerTeam,
      constraints: {},
    }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiResponseError(payload?.error ?? "Trade suggestions failed", res.status);
  }
  return res.json();
}

export async function fetchAutomaticOneForTwoSuggestions(
  league: "ldl" | "bdb",
  teamId: string,
  outgoingNbaId: number,
  basis: TradeBasis = "season",
  windowDays = 14,
  limit = 6,
): Promise<FantasyAutomaticTradePackageSuggestions> {
  const res = await fetch(`/api/fantasy/${league}/trade-package-suggestions`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selected_team_id: teamId,
      outgoing_player_id: outgoingNbaId,
      intent: "balanced",
      basis,
      window_days: windowDays,
      limit,
    }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiResponseError(payload?.error ?? "Automatic one-for-two suggestions failed", res.status);
  }
  return res.json();
}

export async function fetchTradePackageAnalysis(
  league: "ldl" | "bdb",
  request: {
    selected_team_id: string;
    counterparty_team_id: string;
    selected_team_sends: number[];
    counterparty_team_sends: number[];
    drops: { selected_team: number | null; counterparty_team: number | null };
    assets: Array<{ type: "draft_pick"; pick_id: number; from_team: "selected_team" | "counterparty_team" }>;
    basis: TradeBasis;
    window_days?: number;
  },
): Promise<FantasyTradePackageAnalysis> {
  const res = await fetch(`/api/fantasy/${league}/trade-package-analysis`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, intent: "balanced", window_days: request.window_days ?? 14 }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiResponseError(payload?.error ?? "Manual trade-package analysis failed", res.status);
  }
  const payload = await res.json() as FantasyTradePackageAnalysis;
  if (request.assets.length > 0 && !payload.pick_value) {
    throw new ApiResponseError("The backend did not assess the selected picks; deploy the canonical pick-analysis release before using them.", 503);
  }
  return payload;
}

export async function fetchTradeDraftAssets(
  league: "ldl" | "bdb",
): Promise<import("@/lib/draftAssetTypes").DraftAssetsResponse> {
  const res = await fetch(`/api/fantasy/${league}/draft-assets?eligibility=eligible`, { cache: "no-store" });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiResponseError(payload?.error ?? "Draft assets could not be loaded", res.status);
  }
  return res.json();
}

export async function fetchLeaguePlayerExplorer(
  league: string,
  window = 7,
): Promise<LeaguePlayerExplorer> {
  const res = await fetch(
    `${BASE}/api/fantasy/${encodeURIComponent(league)}/players?window=${window}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error("Failed to fetch league player explorer");
  return res.json();
}

export async function fetchFreeAgentRadar(
  league: "ldl" | "bdb",
  window = 7,
  minimumGames = 2,
): Promise<FantasyFreeAgentRadar> {
  const res = await fetch(
    `${BASE}/api/fantasy/${league}/free-agent-radar?window=${window}&min_games=${minimumGames}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error("Failed to fetch free-agent radar");
  return res.json();
}

export async function fetchFantasyWatchlist(
  league: "ldl" | "bdb",
  window = 7,
): Promise<FantasyWatchlist> {
  const res = await fetch(
    `/api/watchlist/${league}?window=${window}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch fantasy watchlist");
  return res.json();
}

export async function fetchFantasyMatchupsForTeam(
  leagueSlug: string,
  teamId: string,
): Promise<FantasyMatchupPeriod> {
  const res = await fetch(
    `${BASE}/api/fantasy/${encodeURIComponent(leagueSlug)}/matchups/${encodeURIComponent(teamId)}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error("Failed to fetch fantasy matchups");
  return res.json();
}

export async function fetchFantasyLeagues(): Promise<FantasyLeague[]> {
  const res = await fetch(`${BASE}/api/fantasy/leagues`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch fantasy leagues");
  return res.json();
}

export async function fetchPersonalFantasyMatchups(
  leagueSlug: string,
): Promise<FantasyMatchupPeriod | null> {
  const leagues = await fetchFantasyLeagues();
  const league = leagues.find((item) => item.slug === leagueSlug && item.enabled);
  if (!league?.personal_team_id) return null;

  return fetchFantasyMatchupsForTeam(league.slug, league.personal_team_id);
}

export async function fetchPersonalFantasyPerformance(
  leagueSlug: string,
): Promise<FantasyRosterPerformance | null> {
  const leagues = await fetchFantasyLeagues();
  const league = leagues.find((item) => item.slug === leagueSlug && item.enabled);
  if (!league?.personal_team_id) return null;
  return fetchFantasyRosterPerformance(leagueSlug, league.personal_team_id);
}

// ── Scoreboard & News ────────────────────────────────────────────────────────

export interface GameTeam {
  name: string; short: string; logo: string | null;
  score: string | null; winner: boolean;
}
export interface Game {
  id: string; date: string; status: string;
  completed: boolean; home: GameTeam; away: GameTeam;
}
export interface NewsItem {
  headline: string; description: string | null;
  published: string; link: string | null;
  image: string | null; categories: string[];
}

export async function fetchScoreboard(): Promise<Game[]> {
  const res = await fetch(`${BASE}/api/nba/scoreboard`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchNews(limit = 8): Promise<NewsItem[]> {
  const res = await fetch(`${BASE}/api/nba/news?limit=${limit}`, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTopContracts(n = 50): Promise<(Player & { rank: number; contract: Contract })[]> {
  const res = await fetch(`${BASE}/api/nba/contracts/top?n=${n}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Failed to fetch contracts");
  return res.json();
}
