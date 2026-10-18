"use client";

import { cn } from "@/lib/utils";
import type { MeetingStatus } from "../../types/meeting.types";
import { getMeetingStatusLabel } from "../../utils/meeting-labels.utils";

interface MeetingStatusTagProps {
  status: MeetingStatus;
  className?: string;
}

const meetingStatusTagClassByStatus: Record<MeetingStatus, string> = {
  SCHEDULED: "bg-info-soft text-info-content ring-ring",
  LIVE: "bg-success-soft text-success-content ring-success-outline",
  ENDED: "bg-muted text-foreground ring-ring",
  CANCELLED: "bg-destructive-soft text-destructive-content ring-destructive-outline",
};

export function MeetingStatusTag({
  status,
  className,
}: MeetingStatusTagProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 text-center text-xs font-semibold uppercase ring-1",
        meetingStatusTagClassByStatus[status],
        className,
      )}
    >
      {getMeetingStatusLabel(status)}
    </span>
  );
}
