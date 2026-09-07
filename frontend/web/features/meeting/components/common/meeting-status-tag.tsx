"use client";

import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import type { MeetingStatus } from "../../types/meeting.types";

interface MeetingStatusTagProps {
  status: MeetingStatus;
  className?: string;
}

const meetingStatusTagClassByStatus: Record<MeetingStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 ring-blue-200",
  LIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ENDED: "bg-slate-100 text-slate-700 ring-slate-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
};

export function MeetingStatusTag({
  status,
  className,
}: MeetingStatusTagProps) {
  const intl = useAppIntl();

  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 text-center text-xs font-black uppercase ring-1",
        meetingStatusTagClassByStatus[status],
        className,
      )}
    >
      {intl.formatMessage({ id: `meeting.history.status.${status}` })}
    </span>
  );
}
