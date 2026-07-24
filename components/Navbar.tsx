"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/players", label: "Player Explorer" },
  { href: "/fantasy/ldl", label: "LDL" },
  { href: "/fantasy/bdb", label: "BδB" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:flex-nowrap">
        <Link href="/" className="text-base font-bold text-slate-900 dark:text-slate-100 shrink-0">
          🏀 My NBA
        </Link>

        <div className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:ml-2 sm:w-auto sm:overflow-visible">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <a
          href="/cdn-cgi/access/logout"
          className="ml-auto shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          Sign out
        </a>
      </nav>
    </header>
  );
}
