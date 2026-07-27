export default function PlayerIntelligenceLoading() {
  return (
    <main aria-busy="true" aria-label="Loading player intelligence" className="mx-auto w-full max-w-6xl animate-pulse px-4 py-8 sm:py-10">
      <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
        <div className="flex items-center gap-5">
          <div className="h-24 w-24 shrink-0 rounded-3xl bg-slate-200 dark:bg-slate-700 sm:h-28 sm:w-28" />
          <div className="flex-1 space-y-3"><div className="h-3 w-36 rounded bg-blue-100 dark:bg-blue-950" /><div className="h-9 max-w-sm rounded bg-slate-200 dark:bg-slate-700" /><div className="h-4 w-56 rounded bg-slate-100 dark:bg-slate-800" /></div>
        </div>
      </section>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900" />)}</section>
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"><div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-700" /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 9 }).map((_, index) => <div key={index} className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div></section>
    </main>
  );
}
