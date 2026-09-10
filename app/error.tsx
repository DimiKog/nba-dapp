"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-6 py-16">
      <section
        className="w-full rounded-2xl border border-red-200 bg-red-50 p-8 text-slate-950 shadow-sm dark:border-red-950 dark:bg-red-950/30 dark:text-slate-50"
        role="alert"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700 dark:text-red-300">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-bold">This page could not be loaded.</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Your account and data have not been changed. Try loading the page again.
        </p>
        <button
          className="mt-6 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
