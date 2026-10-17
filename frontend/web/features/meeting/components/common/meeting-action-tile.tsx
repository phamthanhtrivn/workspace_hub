"use client";

import { cn } from "@/lib/utils";
import {
  meetingActionIconById,
  MeetingDashboardActionId,
  MeetingDashboardTone,
} from "../../types/meeting.constants";

interface MeetingActionTileProps {
  actionId: MeetingDashboardActionId;
  title: string;
  description: string;
  tone: MeetingDashboardTone;
  enabled: boolean;
  onClick?: () => void;
}

export function MeetingActionTile({
  actionId,
  title,
  description,
  enabled,
  onClick,
}: MeetingActionTileProps) {
  const Icon = meetingActionIconById[actionId];
  const isPrimary = actionId === MeetingDashboardActionId.NEW_MEETING;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={cn(
        "flex min-h-24 items-start gap-3 rounded-control p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isPrimary ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "border border-border bg-card text-card-foreground hover:bg-accent",
        enabled
          ? "cursor-pointer"
          : "cursor-not-allowed opacity-80",
      )}
    >
      <span className="mt-0.5 shrink-0">
        <Icon className="size-5" aria-hidden />
      </span>

      <span className="space-y-2">
        <span className="block text-sm font-semibold leading-tight">
          {title}
        </span>
        <span className={cn("block text-xs leading-5", isPrimary ? "text-primary-foreground" : "text-muted-foreground")}>
          {description}
        </span>
        {!enabled ? (
          <span className="block text-xs">
            Soon
          </span>
        ) : null}
      </span>
    </button>
  );
}
