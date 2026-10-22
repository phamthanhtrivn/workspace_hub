"use client";

import { formatDateTime } from "@/lib/date";

export function MeetingMessageTimeDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-3 text-xs font-semibold uppercase text-muted-foreground">
      <span className="h-px flex-1 bg-accent" />
      <span>{formatDateTime(date)}</span>
      <span className="h-px flex-1 bg-accent" />
    </div>
  );
}
