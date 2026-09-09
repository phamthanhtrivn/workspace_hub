"use client";

import { CalendarDays } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useUpcomingMeetings } from "../../hooks/useScheduledMeetings";
import { MeetingDashboardNavItemId } from "../../types/meeting.constants";

interface UpcomingMeetingsOverviewProps {
  onViewAll: (itemId: MeetingDashboardNavItemId) => void;
}

function formatShortRange(startAt: string | null, locale: string) {
  if (!startAt) return "";
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function UpcomingMeetingsOverview({
  onViewAll,
}: UpcomingMeetingsOverviewProps) {
  const intl = useAppIntl();
  const { data } = useUpcomingMeetings({ page: 1, limit: 3 });
  const meetings = data?.data.items ?? [];

  if (meetings.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-black text-[#172B4D]">
          <CalendarDays className="h-5 w-5 text-[#0052CC]" />
          {intl.formatMessage({ id: "meeting.overview.upcoming" })}
        </h2>
        <button
          type="button"
          onClick={() => onViewAll(MeetingDashboardNavItemId.UPCOMING)}
          className="cursor-pointer text-sm font-black text-[#0052CC] hover:text-[#0C66E4]"
        >
          {intl.formatMessage({ id: "meeting.overview.viewAll" })}
        </button>
      </div>
      <div className="mt-3 divide-y divide-slate-100">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-700">
                {meeting.title}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {formatShortRange(meeting.scheduledStartAt, intl.locale)}
              </p>
            </div>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
              {meeting.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
