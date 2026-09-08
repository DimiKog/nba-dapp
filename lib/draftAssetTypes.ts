export type DraftPickValueTier =
  | "premium"
  | "strong"
  | "useful"
  | "secondary"
  | "minor"
  | "fringe";

export interface DraftPickValuation {
  status: "shadow";
  affects_recommendations: false;
  compensation_band: {
    conservative: DraftPickValueTier;
    optimistic: DraftPickValueTier;
  };
  [key: string]: unknown;
}

export interface DraftAsset {
  id: number;
  league_slug: "ldl" | "bdb";
  draft_year: number;
  round: number;
  original_franchise: { id: string; name: string };
  current_owner: {
    id: string;
    name: string;
    fantrax_team_external_id: string | null;
  } | null;
  ownership_state: "owned" | "conditional";
  status: "active" | "consumed" | "cancelled" | "archived";
  optimistic_version: number;
  eligibility: {
    mode: "enabled" | "draft_year_only" | "disabled";
    eligible: boolean;
    reason: string;
    opens_at: string | null;
    closes_at: string | null;
    evaluated_at: string;
  };
  conditional_obligations: Array<{
    obligation_key: string;
    draft_year: number;
    round: number;
    condition_type: "best_of" | "worst_of";
    beneficiary_franchise_id: string;
    beneficiary_name: string;
    status: "unresolved" | "resolved" | "cancelled";
  }>;
  valuation: DraftPickValuation | null;
  valuation_unavailable_reason?: string | null;
}

export interface DraftAssetsResponse {
  league_slug: "ldl" | "bdb";
  rule_set: {
    fantasy_season: string;
    version: number;
    activated_at: string;
  };
  count: number;
  assets: DraftAsset[];
}
