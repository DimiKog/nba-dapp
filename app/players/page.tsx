import { Suspense } from "react";
import DiscoveryWorkspace from "@/components/discovery/DiscoveryWorkspace";

export default function PlayersPage() {
  return (
    <Suspense fallback={<DiscoveryLoading />}>
      <DiscoveryWorkspace />
    </Suspense>
  );
}

function DiscoveryLoading() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-[1500px] px-4 py-8">
      <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-6 h-12 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      <div className="mt-5 h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </main>
  );
}
