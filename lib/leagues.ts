export const LEAGUE_SLUGS = ["ldl", "bdb"] as const;
export type LeagueSlug = (typeof LEAGUE_SLUGS)[number];

export const LEAGUE_PRESENTATION = {
  ldl: { label: "LDL", showTenure: true, showClaimTokens: false, scoreboardPlayerClasses: "border-cyan-500 bg-cyan-50 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-200" },
  bdb: { label: "BδB", showTenure: false, showClaimTokens: true, scoreboardPlayerClasses: "border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200" },
} as const satisfies Record<LeagueSlug, {
  label: string;
  showTenure: boolean;
  showClaimTokens: boolean;
  scoreboardPlayerClasses: string;
}>;

export function isLeagueSlug(value: string | null | undefined): value is LeagueSlug {
  return LEAGUE_SLUGS.some((slug) => slug === value);
}

export function leaguePresentation(value: string | null | undefined) {
  return isLeagueSlug(value) ? LEAGUE_PRESENTATION[value] : null;
}

const LEAGUE_STORAGE_KEY = "nba-app:league";

type Listener = () => void;
const listeners = new Set<Listener>();

function emitLeagueStore() {
  listeners.forEach((listener) => listener());
}

export function parseLeagueSlug(value: string | null | undefined): LeagueSlug {
  return value === "bdb" ? "bdb" : "ldl";
}

export function leagueLabel(league: LeagueSlug): string {
  return LEAGUE_PRESENTATION[league].label;
}

export function readStoredLeague(): LeagueSlug | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(LEAGUE_STORAGE_KEY);
  if (isLeagueSlug(value)) return value;
  return null;
}

export function getStoredLeagueSnapshot(): LeagueSlug {
  return readStoredLeague() ?? "ldl";
}

export function getServerLeagueSnapshot(): LeagueSlug {
  return "ldl";
}

export function subscribeLeagueStore(listener: Listener) {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key === LEAGUE_STORAGE_KEY) listener();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function storeLeague(league: LeagueSlug) {
  if (typeof window === "undefined") return;
  const previous = window.sessionStorage.getItem(LEAGUE_STORAGE_KEY);
  if (previous === league) return;
  window.sessionStorage.setItem(LEAGUE_STORAGE_KEY, league);
  emitLeagueStore();
}

export function resolveClientLeague(
  urlValue: string | null | undefined,
  storedLeague: LeagueSlug = getStoredLeagueSnapshot(),
): LeagueSlug {
  if (isLeagueSlug(urlValue)) return urlValue;
  return storedLeague;
}
