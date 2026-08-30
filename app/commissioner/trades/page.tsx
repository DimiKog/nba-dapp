import CommissionerTradeLedger from "@/components/CommissionerTradeLedger";
import {
  loadCompletedTradeWorkspace,
  type CompletedTradeList,
  type CompletedTradeOptions,
} from "@/lib/completedTradesServer";

type PageSearchParams = Promise<{ league?: string }>;

export default async function CommissionerTradesPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const league = params.league === "bdb" ? "bdb" : "ldl";
  let workspace: { options: CompletedTradeOptions; history: CompletedTradeList };
  try {
    workspace = await loadCompletedTradeWorkspace(league);
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
