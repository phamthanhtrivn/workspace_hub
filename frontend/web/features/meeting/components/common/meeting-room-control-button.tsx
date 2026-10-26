"use client";

import type { MouseEventHandler } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_BADGE_COUNT,
  MIN_VISIBLE_BADGE_COUNT,
  OVERFLOW_BADGE_LABEL,
} from "../../types/meeting.constants";
import { Button } from "@/components/ui/button";


interface MeetingRoomControlButtonProps {
  label: string;
  ariaLabel?: string;
  icon: LucideIcon;
  active?: boolean;
  badgeCount?: number;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function MeetingRoomControlButton({
  label,
  ariaLabel,
  icon: Icon,
  active = false,
  badgeCount = 0,
  danger = false,
  disabled = false,
  loading = false,
  onClick,
}: MeetingRoomControlButtonProps) {
  const shouldShowBadge = badgeCount >= MIN_VISIBLE_BADGE_COUNT;
  const badgeLabel =
    badgeCount > MAX_BADGE_COUNT ? OVERFLOW_BADGE_LABEL : String(badgeCount);

  return (
    <Button variant="unstyled"
      loading={loading}
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={danger ? undefined : active}
      className={cn(
        "cursor-pointer relative flex h-12 w-14 sm:h-[68px] sm:w-[76px] shrink-0 flex-col items-center justify-center gap-1.5 overflow-visible rounded-control text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "bg-destructive text-destructive-foreground hover:bg-destructive"
          : active
            ? "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft"
            : "bg-secondary text-secondary-foreground hover:bg-accent",
      )}
    >
      {shouldShowBadge ? (
        <span className="absolute right-3.5 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold leading-none text-destructive-foreground ring-1 ring-border/30">
          <span>{badgeLabel}</span>
        </span>
      ) : null}
      <Icon className="h-5 w-5" />
      <span className="max-w-full truncate px-1">{label}</span>
    </Button>
  );
}
