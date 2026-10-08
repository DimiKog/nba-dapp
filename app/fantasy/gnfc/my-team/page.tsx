import Link from "next/link";
import { redirect } from "next/navigation";
import { loadCurrentFantasySession, membershipFor } from "@/lib/fantasySessionServer";

export default async function GnfcMyTeamPage() {
  const membership = membershipFor(await loadCurrentFantasySession(), "gnfc");
  if (membership?.fantrax_team_id) {
    redirect(`/fantasy/gnfc/roster/${encodeURIComponent(membership.fantrax_team_id)}`);
  }
  const accountLinked = Boolean(membership);
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">
          {accountLinked ? `${membership?.franchise_name} roster pending` : "GNFC Γ5 team link pending"}
        </h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          {accountLinked
            ? "Your account is linked to the shared franchise. The personal roster link will appear after the verified team mapping and roster snapshot are available."
            : "Your app account has not yet been linked to a GNFC franchise. You can still open public league standings."}
        </p>
        <Link href="/fantasy/gnfc" className="mt-4 inline-block text-sm font-bold text-blue-700 hover:underline dark:text-blue-300">
          View GNFC standings →
        </Link>
      </div>
    </main>
  );
}
