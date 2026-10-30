import Image from "next/image";
import type { ReactNode } from "react";
import { photoUrl } from "@/lib/api";

type PlayerIdentityCellProps = {
  name: string;
  photo?: string | null;
  nbaId?: number | null;
  position?: string | null;
  nbaTeam?: string | null;
  size?: "sm" | "md";
  trailing?: ReactNode;
};

/**
 * Shared player identity presentation for Discovery rows/cards.
 * Reuses existing photoUrl resolution — no new photo pipeline.
 */
export default function PlayerIdentityCell({
  name,
  photo,
  nbaId,
  position,
  nbaTeam,
  size = "md",
  trailing,
}: PlayerIdentityCellProps) {
  const src = photoUrl(photo ?? null, nbaId);
  const dimension = size === "sm" ? 36 : 44;
  const meta = [position, nbaTeam].filter(Boolean).join(" · ");

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
        style={{ width: dimension, height: dimension }}
      >
        {src ? (
          <Image
            src={src}
            alt=""
            width={dimension}
            height={dimension}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
            {name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-bold text-slate-950 dark:text-white ${size === "sm" ? "text-sm" : "text-base"}`}>
          {name}
        </p>
        {meta ? (
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{meta}</p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}
