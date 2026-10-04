"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function RefreshDataButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:text-blue-300"
    >
      {pending ? "Refreshing…" : "Refresh data"}
    </button>
  );
}
