import { Suspense } from "react";
import PlayerComparison from "@/components/PlayerComparison";

export default function PlayerComparisonPage() {
  return (
    <Suspense fallback={<ComparisonLoading />}>
      <PlayerComparison />
    </Suspense>
  );
}

function ComparisonLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="mt-8 h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </main>
  );
}
