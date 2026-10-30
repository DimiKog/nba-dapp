"use client";

import { useState, type ReactNode } from "react";
import { photoUrl } from "@/lib/api";

type PlayerIdentityCellProps = {
  name: string;
  photo?: string | null;
  nbaId?: number | null;
  position?: string | null;
  nbaTeam?: string | null;
  size?: "sm" | "md" | "lg";
  injury?: boolean;
  trailing?: ReactNode;
  metaExtra?: ReactNode;
};

const SIZE_PX = { sm: 36, md: 40, lg: 56 } as const;

/**
 * Shared player identity presentation for Discovery rows/cards.
 * Uses existing photoUrl resolution with graceful img fallback.
 */
export default function PlayerIdentityCell({
  name,
  photo,
  nbaId,
  position,
  nbaTeam,
  size = "md",
  injury = false,
  trailing,
  metaExtra,
}: PlayerIdentityCellProps) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? photoUrl(photo ?? null, nbaId) : null;
  const dimension = SIZE_PX[size];
  const meta = [position, nbaTeam].filter(Boolean).join(" · ");

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
        style={{ width: dimension, height: dimension }}
      >
        {src ? (
          // Photos may be local backend assets or external source URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            width={dimension}
            height={dimension}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-bold text-slate-400"
            style={{ fontSize: size === "lg" ? 18 : 11 }}
          >
            {name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-bold text-slate-950 dark:text-white ${size === "sm" ? "text-sm" : "text-[15px]"}`}>
          {name}
        </p>
        {(meta || injury || metaExtra) && (
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            {meta ? <span className="truncate">{meta}</span> : null}
            {injury ? (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-300">
                Inj
              </span>
            ) : null}
            {metaExtra}
          </div>
        )}
      </div>
      {trailing}
    </div>
  );
}
