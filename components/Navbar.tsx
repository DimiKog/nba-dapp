"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/players", label: "Players" },
  { href: "/contracts", label: "Contracts" },
  { href: "/fantasy/ldl", label: "LDL" },
  { href: "/fantasy/bdb", label: "BδB" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-base font-bold text-slate-900 dark:text-slate-100 shrink-0">
          🏀 My NBA
        </Link>

        <div className="flex items-center gap-1 ml-2">
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
      </nav>
    </header>
  );
}
