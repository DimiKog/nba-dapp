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
      title: "Waiting for draft and roster verification",
      description: "All teams have joined. Free-agent proposals remain closed until the draft is complete and the backend verifies a full league snapshot.",
      remainingTeams: 0,
    };
  }
  return {
    title: "Free-agent proposals are not shown in this preview",
    description: "The backend activation flag is on, but this preview does not expose proposals. The dedicated free-agent view still needs a separate release and verification.",
    remainingTeams: 0,
  };
}
