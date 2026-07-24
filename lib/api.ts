const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

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
  if (!res.ok) throw new Error("Player not found");
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
}

export interface FantasyPlayer {
  player_id: number | null;
  fantrax_scorer_id: string | null;
  name: string;
  short_name: string;
  nba_team: string;
  nba_team_short: string;
  position: string;
  status: "Active" | "Reserve" | "IR" | "?";
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
      missing_players: number;
      cap: number | null;
      remaining: number | null;
      status: "under" | "over" | "incomplete" | "cap_unavailable";
      cap_provisional: boolean | null;
    }>;
  };
  players: FantasyPlayerPerformance[];
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
  league: "ldl" | "bdb",
  window = 7,
): Promise<FantasyRosterPerformance> {
  const res = await fetch(
    `${BASE}/api/fantasy/${league}/my-team/players?window=${window}`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) throw new Error("Failed to fetch roster performance");
  return res.json();
}

export async function fetchFantasyLeagues(): Promise<FantasyLeague[]> {
  const res = await fetch(`${BASE}/api/fantasy/leagues`, {
    next: { revalidate: 3600 },
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
