export type GnfcPreviewStatus = {
  title: string;
  description: string;
  remainingTeams: number;
};

export function gnfcPreviewStatus(
  joinedTeams: number,
  expectedTeams = 12,
  availabilityReady = false,
): GnfcPreviewStatus {
  const remainingTeams = Math.max(0, expectedTeams - joinedTeams);
  if (remainingTeams > 0) {
    return {
      title: `Waiting for ${remainingTeams} more ${remainingTeams === 1 ? "team" : "teams"}`,
      description: `${joinedTeams} of ${expectedTeams} teams have joined Fantrax. Free-agent proposals stay closed until all teams join, the draft finishes, and a complete roster snapshot is verified.`,
      remainingTeams,
    };
  }
  if (!availabilityReady) {
    return {
      title: "Free-agent proposals await verification",
      description: "All teams have joined. Rosters can be viewed now; free-agent proposals remain closed until the full league snapshot is verified and the separate feature is enabled.",
      remainingTeams: 0,
    };
  }
  return {
    title: "Free-agent proposal access enabled",
    description: "Results still require a complete current roster snapshot. If that check fails, proposals remain unavailable.",
    remainingTeams: 0,
  };
}
