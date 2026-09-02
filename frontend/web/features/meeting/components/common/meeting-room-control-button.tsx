"use client";

import type { MouseEventHandler } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeetingRoomControlButtonProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function MeetingRoomControlButton({
  label,
  icon: Icon,
  active = false,
  danger = false,
  disabled = false,
  onClick,
}: MeetingRoomControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-[68px] w-[76px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "bg-red-600 text-white hover:bg-red-500"
          : active
            ? "bg-white text-[#172B4D] shadow-lg"
            : "bg-white/10 text-slate-200 ring-1 ring-white/10 hover:bg-white/16",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="max-w-full truncate px-1">{label}</span>
    </button>
  );
}
