"use client";

import { CalendarDays, Plus } from "lucide-react";
import { ViewAllAction } from "@/components/common/view-all-action";
import { QueryFeedback } from "@/components/common/query-feedback";
import type { useUpcomingMeetings } from "../../hooks/useScheduledMeetings";
import type { UpcomingMeetingItem } from "../../types/meeting.types";
import { formatMeetingOverviewDate, getUpcomingMeetingRelativeTime } from "../../utils/meeting-overview.utils";
import { MeetingStatusTag } from "../common/meeting-status-tag";
import { UpcomingMeetingCard } from "../schedule/upcoming-meeting-card";
import { MeetingEmptyState } from "../ui/meeting-empty-state";
import { MeetingButton } from "../ui/meeting-form-controls";

interface MeetingOverviewUpcomingProps {
  query: ReturnType<typeof useUpcomingMeetings>;
  now: Date;
  onViewAll: () => void;
  onSchedule: () => void;
  onEdit: (meeting: UpcomingMeetingItem) => void;
}

export function MeetingOverviewUpcoming({ query, now, onViewAll, onSchedule, onEdit }: MeetingOverviewUpcomingProps) {
  const upcoming = query.data?.data;
  const [nearest, ...following] = upcoming?.items ?? [];

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="meeting-overview-upcoming-title">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 id="meeting-overview-upcoming-title" className="text-section-title font-semibold text-foreground">Next meetings</h2>
        <ViewAllAction label="View all" onClick={onViewAll} aria-label="View all upcoming meetings" />
      </div>

      <QueryFeedback label="upcoming meetings" pending={query.isPending && !upcoming}
        error={query.isError} retrying={query.isFetching} onRetry={() => query.refetch()} />

      {nearest ? (
        <>
          <p className="text-sm font-medium text-muted-foreground">{getUpcomingMeetingRelativeTime(nearest, now)}</p>
          <UpcomingMeetingCard meeting={nearest} onEdit={onEdit} />
          {following.length > 0 ? (
            <ul className="divide-y divide-border">
              {following.map(meeting => (
                <li key={meeting.id} className="flex min-w-0 items-start gap-3 py-4">
                  <CalendarDays aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 break-words text-sm font-semibold text-foreground">{meeting.title}</h3>
                    <p className="mt-1 text-xs leading-5 tabular-nums text-muted-foreground">{formatMeetingOverviewDate(meeting.scheduledStartAt)}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{getUpcomingMeetingRelativeTime(meeting, now)}</p>
                  </div>
                  <MeetingStatusTag status={meeting.status} />
                </li>
              ))}
            </ul>
          ) : null}
          <MeetingButton type="button" tone="outline" onClick={onSchedule}>
            <Plus aria-hidden className="size-4" /> Schedule meeting
          </MeetingButton>
        </>
      ) : upcoming && !query.isError ? (
        <MeetingEmptyState icon={CalendarDays} title="No upcoming meetings"
          description="Plan your next conversation when you are ready."
          actionLabel="Schedule meeting" onAction={onSchedule} />
      ) : null}
    </section>
  );
}
