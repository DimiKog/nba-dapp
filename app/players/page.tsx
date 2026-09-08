import { Suspense } from "react";
import LeaguePlayerExplorer from "@/components/LeaguePlayerExplorer";

export default function PlayersPage() {
  return (
    <Suspense fallback={<ExplorerLoading />}>
      <LeaguePlayerExplorer />
    </Suspense>
  );
}

function ExplorerLoading() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-[1500px] px-4 py-8">
      <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="mt-5 h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </main>
  );
}
