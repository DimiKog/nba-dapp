export type HomeAttentionTeam = {
  league: "ldl" | "bdb" | "gnfc";
  teamId: string;
  teamName: string;
  rosterCount: number | null;
  rosterMinimum: number | null;
  capRemaining: number | null;
  injuredPlayerNames: string[];
};

type HomeAttentionItemBase = {
  key: string;
  league: HomeAttentionTeam["league"];
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "warning";
};

export type HomeAttentionItem =
  | (HomeAttentionItemBase & { kind: "roster" | "cap" })
  | (HomeAttentionItemBase & { kind: "injury"; injuryCount: number });

const INJURY_DETAIL_VISIBLE = 3;

export function formatInjuryDetail(names: string[], visible = INJURY_DETAIL_VISIBLE): string {
  if (names.length <= visible) return names.join(" · ");
  return `${names.slice(0, visible).join(" · ")} · +${names.length - visible}`;
}

function compactMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${value.toLocaleString("en-US")}`;
}

export function buildHomeAttentionItems(teams: HomeAttentionTeam[]): HomeAttentionItem[] {
  const rosterItems: HomeAttentionItem[] = [];
  const capItems: HomeAttentionItem[] = [];
  const injuryItems: HomeAttentionItem[] = [];

  for (const team of teams) {
    const rosterHref = `/fantasy/${team.league}/roster/${encodeURIComponent(team.teamId)}`;
    if (team.rosterMinimum != null && team.rosterCount != null && team.rosterCount < team.rosterMinimum) {
      rosterItems.push({
        key: `${team.league}-roster`,
        kind: "roster",
        league: team.league,
        title: `${team.teamName} roster is incomplete`,
        detail: `${team.rosterCount} of at least ${team.rosterMinimum} players. Recommendations remain provisional.`,
        href: `/watchlist?league=${team.league}`,
        tone: "critical",
      });
    }

    if (team.capRemaining != null && team.capRemaining < 0) {
      capItems.push({
        key: `${team.league}-cap`,
        kind: "cap",
        league: team.league,
        title: `${team.teamName} is ${compactMoney(Math.abs(team.capRemaining))} over the cap`,
        detail: "Review salaries before the next roster decision.",
        href: rosterHref,
        tone: "critical",
      });
    }

    if (team.injuredPlayerNames.length > 0) {
      injuryItems.push({
        key: `${team.league}-injuries`,
        kind: "injury",
        league: team.league,
        injuryCount: team.injuredPlayerNames.length,
        title: `${team.injuredPlayerNames.length} injury ${team.injuredPlayerNames.length === 1 ? "alert" : "alerts"} on ${team.teamName}`,
        detail: formatInjuryDetail(team.injuredPlayerNames),
        href: rosterHref,
        tone: "warning",
      });
    }
  }

  return [...rosterItems, ...capItems, ...injuryItems];
}
