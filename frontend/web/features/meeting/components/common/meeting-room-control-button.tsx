"use client";

import type { MouseEventHandler } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_VISIBLE_BADGE_COUNT = 1;
const MAX_BADGE_COUNT = 99;
const OVERFLOW_BADGE_LABEL = "99+";

interface MeetingRoomControlButtonProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badgeCount?: number;
  badgeIcon?: LucideIcon;
  danger?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function MeetingRoomControlButton({
  label,
  icon: Icon,
  active = false,
  badgeCount = 0,
  badgeIcon: BadgeIcon,
  danger = false,
  disabled = false,
  onClick,
}: MeetingRoomControlButtonProps) {
  const shouldShowBadge = badgeCount >= MIN_VISIBLE_BADGE_COUNT;
  const badgeLabel =
    badgeCount > MAX_BADGE_COUNT
      ? OVERFLOW_BADGE_LABEL
      : String(badgeCount);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex h-[68px] w-[76px] shrink-0 flex-col items-center justify-center gap-1.5 overflow-visible rounded-lg text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "bg-red-600 text-white hover:bg-red-500"
          : active
            ? "bg-white text-[#172B4D] shadow-lg"
            : "bg-white/10 text-slate-200 ring-1 ring-white/10 hover:bg-white/16",
      )}
    >
      {shouldShowBadge ? (
        <span className="absolute right-1.5 top-1.5 inline-flex min-w-6 items-center justify-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black leading-4 text-white shadow-[0_8px_18px_rgba(220,38,38,0.35)] ring-1 ring-white/30">
          {BadgeIcon ? <BadgeIcon className="h-3 w-3" /> : null}
          <span>{badgeLabel}</span>
        </span>
      ) : null}
      <Icon className="h-5 w-5" />
      <span className="max-w-full truncate px-1">{label}</span>
    </button>
  );
}
