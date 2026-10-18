"use client";

import type { MeetingStatus } from "../../types/meeting.types";
import { MeetingStatusBadge } from "../ui/meeting-status-badge";
import { cn } from "@/lib/utils";

interface MeetingStatusTagProps {
  status: MeetingStatus;
  className?: string;
}

export function MeetingStatusTag({
  status,
  className,
}: MeetingStatusTagProps) {
  return (
    <MeetingStatusBadge status={status} className={cn("h-7 text-center", className)} />
  );
}
