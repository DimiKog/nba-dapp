import FantasyRosterPage from "@/components/FantasyRosterPage";

export default async function BDBRosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return <FantasyRosterPage league="bdb" teamId={teamId} />;
}
