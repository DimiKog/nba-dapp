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

export async function fetchTopContracts(n = 50): Promise<(Player & { rank: number; contract: Contract })[]> {
  const res = await fetch(`${BASE}/api/nba/contracts/top?n=${n}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Failed to fetch contracts");
  return res.json();
}
