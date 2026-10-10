export const PLAYER_POSITION_OPTIONS = ["PG", "SG", "G", "SF", "PF", "F", "C"] as const;

export function candidateListCopy(shown: number, matching: number) {
  if (shown === 0) {
    return {
      title: "Explore candidates (0 matches)",
      description: "No players match these filters.",
    };
  }

  if (matching > shown) {
    return {
      title: `Explore ${shown} of ${matching} matching candidates`,
      description: `Only ${shown} candidates are loaded. Narrow the filters to see other matches.`,
    };
  }

  return {
    title: `Explore all ${shown} matching candidates`,
    description: "All matching candidates are shown in overall fit order.",
  };
}
