import { gnfcPreviewStatus } from "@/lib/gnfcPreview";

export default function GnfcAvailabilityNotice({
  joinedTeams,
  expectedTeams,
  availabilityReady,
}: {
  joinedTeams: number;
  expectedTeams: number;
  availabilityReady: boolean;
}) {
  const status = gnfcPreviewStatus(joinedTeams, expectedTeams, availabilityReady);
  return (
    <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
        Free-agent proposals · preview status
      </p>
      <h2 className="mt-1 text-lg font-black">{status.title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6">{status.description}</p>
    </section>
  );
}
