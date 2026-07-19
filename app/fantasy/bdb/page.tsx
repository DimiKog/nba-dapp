import Link from "next/link";

function LeagueTabs({ active }: { active: "ldl" | "bdb" }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit">
      <Link href="/fantasy/ldl" className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${active === "ldl" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>LDL</Link>
      <Link href="/fantasy/bdb" className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${active === "bdb" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>BδB</Link>
    </div>
  );
}

export default function BDBPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Fantasy</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">2026-27 Season</p>
        </div>
        <Link href="/" className="text-sm text-blue-500 hover:underline">← NBA Home</Link>
      </div>
      <LeagueTabs active="bdb" />
      <div className="mt-10 text-center text-slate-500 dark:text-slate-400">
        <p className="text-lg font-medium">BδB league activates for the new season.</p>
        <p className="mt-1 text-sm">Come back when the league is set up on Fantrax.</p>
      </div>
    </main>
  );
}
