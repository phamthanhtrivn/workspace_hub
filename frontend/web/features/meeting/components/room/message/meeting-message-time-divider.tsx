"use client";

import { formatDateTime } from "@/lib/date";

export function MeetingMessageTimeDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-3 text-[11px] font-bold uppercase text-slate-500">
      <span className="h-px flex-1 bg-white/10" />
      <span>{formatDateTime(date)}</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
