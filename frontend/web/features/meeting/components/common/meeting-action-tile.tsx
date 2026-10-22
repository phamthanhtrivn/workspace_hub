"use client";

import { cn } from "@/lib/utils";
import {
  meetingActionIconById,
  MeetingDashboardActionId,
  MeetingDashboardTone,
} from "../../types/meeting.constants";
import { Button } from "@/components/ui/button";


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
    <Button variant="unstyled"
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-3 rounded-panel border border-transparent p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isPrimary ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "border-border bg-card text-card-foreground hover:bg-muted",
        enabled
          ? "cursor-pointer"
          : "cursor-not-allowed opacity-80",
      )}
    >
      <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-control", isPrimary ? "text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block break-words text-sm font-semibold leading-5">
          {title}
        </span>
        <span className={cn("block break-words text-xs font-normal leading-4", isPrimary ? "text-primary-foreground" : "text-muted-foreground")}>
          {description}
        </span>
        {!enabled ? (
          <span className="block text-xs">
            Soon
          </span>
        ) : null}
      </span>
    </Button>
  );
}
