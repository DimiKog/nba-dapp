// GNFC joins FA discovery only; the main LDL/BδB navigation remains unchanged.
export type AvailabilityLeagueSlug = "ldl" | "bdb" | "gnfc";

export function isAvailabilityLeagueSlug(value: string | null | undefined): value is AvailabilityLeagueSlug {
  return value === "ldl" || value === "bdb" || value === "gnfc";
}
