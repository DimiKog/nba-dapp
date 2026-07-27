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
  fantasy_team?: {
    id: string;
    name: string;
    logo: string | null;
    owner: string | null;
  };
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
    { next: { revalidate: 300 } },
  );
  if (!res.ok) throw new Error("Failed to fetch category targets");
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
    `${BASE}/api/fantasy/${league}/watchlist?window=${window}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch fantasy watchlist");
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

  const res = await fetch(
    `${BASE}/api/fantasy/${encodeURIComponent(league.slug)}/matchups/${encodeURIComponent(league.personal_team_id)}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error("Failed to fetch personal fantasy matchups");
  return res.json();
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
