"use client";

import { useState } from "react";

const BDB_LOGO_OVERRIDES: Record<string, string> = {
  laloukas: "/fantasy/bdb/laloukas.png",
  "stretch diamonds": "/fantasy/bdb/stretch-diamonds.png",
  "trust the process": "/fantasy/bdb/trust-the-process.jpg",
  xrtc: "/fantasy/bdb/xrtc.gif",
};

export default function TeamLogo({
  league,
  name,
  logo,
  size = 32,
}: {
  league: string;
  name: string;
  logo: string | null;
  size?: number;
}) {
  const override = league === "bdb" ? BDB_LOGO_OVERRIDES[name.toLowerCase()] : null;
  const source = override ?? logo;
  const [failed, setFailed] = useState(false);

  if (!source || failed) {
    return (
      <span
        aria-label={`${name} logo unavailable`}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300"
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    // Team logos can be remote Fantrax images or local overrides.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

function initials(name: string) {
  const words = name.match(/[A-Za-z0-9]+/g) ?? [];
  if (words.length === 0) return "?";
  const [first = "", second = ""] = words;
  if (words.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}
