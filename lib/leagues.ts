export type LeagueSlug = "ldl" | "bdb";

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
  return league === "ldl" ? "LDL" : "BδB";
}

export function readStoredLeague(): LeagueSlug | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(LEAGUE_STORAGE_KEY);
  if (value === "ldl" || value === "bdb") return value;
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
  if (urlValue === "ldl" || urlValue === "bdb") return urlValue;
  return storedLeague;
}
