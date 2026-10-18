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
        "flex min-h-24 min-w-0 items-start gap-3 rounded-panel p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isPrimary ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "border border-border bg-card text-card-foreground hover:bg-muted",
        enabled
          ? "cursor-pointer"
          : "cursor-not-allowed opacity-80",
      )}
    >
      <span className={cn("mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-control", isPrimary ? "text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
        <Icon className="size-5" aria-hidden />
      </span>

      <span className="min-w-0 space-y-1.5">
        <span className="block break-words text-sm font-semibold leading-5">
          {title}
        </span>
        <span className={cn("block text-xs font-normal leading-5", isPrimary ? "text-primary-foreground" : "text-muted-foreground")}>
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
