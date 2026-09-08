export type FantasyMembership = {
  league_slug: string;
  franchise_id: string;
  franchise_name: string;
  role: "manager" | "commissioner";
  commissioner: boolean;
  fantrax_team_id: string | null;
  mapping_season: string | null;
  mapping_captured_at: string | null;
};

export type FantasySession = {
  user: { id: number; email: string; display_name: string };
  memberships: FantasyMembership[];
};
