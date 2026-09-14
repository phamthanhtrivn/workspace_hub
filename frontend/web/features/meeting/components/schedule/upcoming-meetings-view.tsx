"use client";

import { CalendarDays, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  upcomingMeetingsPageSize,
  useUpcomingMeetings,
} from "../../hooks/useScheduledMeetings";
import type { UpcomingMeetingItem } from "../../types/meeting.types";
import { UpcomingMeetingCard } from "./upcoming-meeting-card";
import { MeetingPagination } from "../common/meeting-pagination";
import { MeetingEmptyState } from "../ui/meeting-empty-state";
import { MeetingButton } from "../ui/meeting-form-controls";
import { MeetingLoadingState } from "../ui/meeting-loading-state";

const MEETING_HIGHLIGHT_DURATION_MS = 4_000;

interface UpcomingMeetingsViewProps {
  highlightJoinToken?: string | null;
  onSchedule: () => void;
  onEdit: (meeting: UpcomingMeetingItem) => void;
}

export function UpcomingMeetingsView({
  highlightJoinToken,
  onSchedule,
  onEdit,
}: UpcomingMeetingsViewProps) {
  const [page, setPage] = useState(1);
  const [activeHighlightJoinToken, setActiveHighlightJoinToken] = useState<
    string | null
  >(null);
  const upcomingQuery = useUpcomingMeetings({ page });
  const upcoming = upcomingQuery.data?.data;
  const meetings = upcoming?.items ?? [];
  const isInitialLoading = upcomingQuery.isLoading && !upcoming;

  useEffect(() => {
    let clearHighlightTimeoutId: number | undefined;
    const activateHighlightTimeoutId = window.setTimeout(() => {
      setActiveHighlightJoinToken(highlightJoinToken ?? null);

      if (highlightJoinToken) {
        clearHighlightTimeoutId = window.setTimeout(
          () => setActiveHighlightJoinToken(null),
          MEETING_HIGHLIGHT_DURATION_MS,
        );
      }
    }, 0);

    return () => {
      window.clearTimeout(activateHighlightTimeoutId);
      if (clearHighlightTimeoutId) {
        window.clearTimeout(clearHighlightTimeoutId);
      }
    };
  }, [highlightJoinToken]);

  useEffect(() => {
    if (!highlightJoinToken || meetings.length === 0) return;

    const highlightedCard = Array.from(
      document.querySelectorAll<HTMLElement>("[data-meeting-join-token]"),
    ).find((card) => card.dataset.meetingJoinToken === highlightJoinToken);
    highlightedCard?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightJoinToken, meetings.length]);

  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-[#172B4D]">
            Upcoming meetings
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Scheduled meetings you host or are invited to.
          </p>
        </div>
        <MeetingButton
          type="button"
          onClick={onSchedule}
          className="cursor-pointer"
        >
          <CalendarDays className="h-4 w-4" />
          Schedule meeting
        </MeetingButton>
      </div>

      {isInitialLoading ? (
        <MeetingLoadingState label="Loading upcoming meetings..." />
      ) : upcomingQuery.isError ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-red-200 bg-white/70 px-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <CalendarDays className="h-9 w-9 text-red-500" />
            <p className="mt-3 text-sm font-black text-slate-700">
              Could not load upcoming meetings.
            </p>
            <MeetingButton
              type="button"
              onClick={() => upcomingQuery.refetch()}
              className="mt-4 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </MeetingButton>
          </div>
        </div>
      ) : meetings.length === 0 ? (
        <MeetingEmptyState
          icon={CalendarDays}
          title="No upcoming meetings"
          description="Schedule a meeting to keep your team aligned."
          actionLabel="Schedule meeting"
          onAction={onSchedule}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {meetings.map((meeting) => (
              <UpcomingMeetingCard
                key={meeting.id}
                meeting={meeting}
                isHighlighted={
                  meeting.joinToken === activeHighlightJoinToken
                }
                onEdit={onEdit}
              />
            ))}
          </div>
          <MeetingPagination
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
