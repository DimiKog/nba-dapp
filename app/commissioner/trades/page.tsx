import CommissionerTradeLedger from "@/components/CommissionerTradeLedger";
import {
  loadCompletedTradeWorkspace,
  type CompletedTradeList,
  type CompletedTradeOptions,
} from "@/lib/completedTradesServer";
import { loadCurrentFantasyAccess, membershipFor } from "@/lib/fantasySessionServer";

type PageSearchParams = Promise<{ league?: string }>;

export default async function CommissionerTradesPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const league = params.league === "bdb" ? "bdb" : "ldl";
  const access = await loadCurrentFantasyAccess();
  const membership = membershipFor(access?.session ?? null, league);
  if (!access || !membership?.commissioner) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">Commissioner access required</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This account cannot manage completed trades for this league.</p>
      </main>
    );
  }
  let workspace: { options: CompletedTradeOptions; history: CompletedTradeList };
  try {
    workspace = await loadCompletedTradeWorkspace(league, access.identityHeaders);
  } catch {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Commissioner tools</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Completed trades unavailable</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          The protected trade ledger or its form options are not configured for this deployment.
        </p>
      </main>
    );
  }
  return <CommissionerTradeLedger options={workspace.options} history={workspace.history} />;
}
