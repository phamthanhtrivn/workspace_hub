"use client";

import { CalendarDays, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  upcomingMeetingsPageSize,
  useUpcomingMeetings,
} from "../../hooks/useScheduledMeetings";
import type { UpcomingMeetingItem } from "../../types/meeting.types";
import { UpcomingMeetingCard } from "./upcoming-meeting-card";
import { MeetingHistoryPagination } from "../history/meeting-history-pagination";

interface UpcomingMeetingsViewProps {
  onSchedule: () => void;
  onEdit: (meeting: UpcomingMeetingItem) => void;
}

export function UpcomingMeetingsView({
  onSchedule,
  onEdit,
}: UpcomingMeetingsViewProps) {
  const intl = useAppIntl();
  const [page, setPage] = useState(1);
  const upcomingQuery = useUpcomingMeetings({ page });
  const upcoming = upcomingQuery.data?.data;
  const meetings = upcoming?.items ?? [];
  const isInitialLoading = upcomingQuery.isLoading && !upcoming;

  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-[#172B4D]">
            {intl.formatMessage({ id: "meeting.upcoming.title" })}
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {intl.formatMessage({ id: "meeting.upcoming.description" })}
          </p>
        </div>
        <button
          type="button"
          onClick={onSchedule}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0052CC] px-4 text-sm font-black text-white transition hover:bg-[#0C66E4]"
        >
          <CalendarDays className="h-4 w-4" />
          {intl.formatMessage({ id: "meeting.schedule.scheduleMeeting" })}
        </button>
      </div>

      {isInitialLoading ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-slate-200 bg-white/70">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0052CC]" />
            <p className="mt-3 text-sm font-black text-slate-600">
              {intl.formatMessage({ id: "meeting.upcoming.loading" })}
            </p>
          </div>
        </div>
      ) : upcomingQuery.isError ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-red-200 bg-white/70 px-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <CalendarDays className="h-9 w-9 text-red-500" />
            <p className="mt-3 text-sm font-black text-slate-700">
              {intl.formatMessage({ id: "meeting.upcoming.error" })}
            </p>
            <button
              type="button"
              onClick={() => upcomingQuery.refetch()}
              className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#0052CC] px-4 text-sm font-black text-white transition hover:bg-[#0C66E4]"
            >
              <RotateCcw className="h-4 w-4" />
              {intl.formatMessage({ id: "app.tryAgain" })}
            </button>
          </div>
        </div>
      ) : meetings.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-slate-200 bg-white/70 px-4">
          <div className="max-w-sm text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-[#0052CC]" />
            <p className="mt-3 text-sm font-black text-slate-700">
              {intl.formatMessage({ id: "meeting.upcoming.emptyTitle" })}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {intl.formatMessage({ id: "meeting.upcoming.emptyDescription" })}
            </p>
            <button
              type="button"
              onClick={onSchedule}
              className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0052CC] px-4 text-sm font-black text-white transition hover:bg-[#0C66E4]"
            >
              {intl.formatMessage({ id: "meeting.schedule.scheduleMeeting" })}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {meetings.map((meeting) => (
              <UpcomingMeetingCard
                key={meeting.id}
                meeting={meeting}
                onEdit={onEdit}
              />
            ))}
          </div>
          <MeetingHistoryPagination
            page={page}
            limit={upcomingMeetingsPageSize}
            total={upcoming?.total ?? 0}
            totalPages={upcoming?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      )}
    </section>
  );
}
