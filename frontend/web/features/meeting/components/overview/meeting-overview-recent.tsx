"use client";

import { History } from "lucide-react";
import { ViewAllAction } from "@/components/common/view-all-action";
import { QueryFeedback } from "@/components/common/query-feedback";
import { useMeetingHistory } from "../../hooks/useMeetingHistory";
import { getMeetingHistoryTitle } from "../../utils/meeting-history.utils";
import { formatMeetingOverviewDate, getRecentMeetingRelativeTime } from "../../utils/meeting-overview.utils";
import { MeetingStatusTag } from "../common/meeting-status-tag";
import { MeetingHistoryAvatarStack } from "../history/meeting-history-avatar-stack";
import { MeetingJoinTokenCopyButton } from "../history/meeting-join-token-copy-button";
import { MeetingEmptyState } from "../ui/meeting-empty-state";

interface MeetingOverviewRecentProps {
  enabled: boolean;
  now: Date;
  onViewHistory: () => void;
}

const RECENT_MEETINGS_LIMIT = 4;

export function MeetingOverviewRecent({ enabled, now, onViewHistory }: MeetingOverviewRecentProps) {
  const query = useMeetingHistory({ page: 1, limit: RECENT_MEETINGS_LIMIT, enabled, refetchOnWindowFocus: true });
  const history = query.data?.data;

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="meeting-overview-recent-title">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 id="meeting-overview-recent-title" className="text-section-title font-semibold text-foreground">Recent meetings</h2>
        <ViewAllAction label="View history" onClick={onViewHistory} aria-label="View meeting history" />
      </div>

      <QueryFeedback label="recent meetings" pending={query.isPending && !history}
        error={query.isError} retrying={query.isFetching} onRetry={() => query.refetch()} />

      {history?.items.length ? (
        <ul className="divide-y divide-border rounded-panel border border-border bg-card text-card-foreground">
          {history.items.map(meeting => {
            const occurredAt = (meeting.status === "ENDED" ? meeting.endedAt : null) || meeting.startedAt || meeting.createdAt;
            return (
              <li key={meeting.id} className="min-w-0 space-y-3 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 break-words text-sm font-semibold">{getMeetingHistoryTitle(meeting)}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{getRecentMeetingRelativeTime(meeting, now)}</p>
                    <p className="text-xs leading-5 tabular-nums text-muted-foreground">{formatMeetingOverviewDate(occurredAt)}</p>
                  </div>
                  <MeetingStatusTag status={meeting.status} />
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <MeetingJoinTokenCopyButton className="min-h-9" joinToken={meeting.joinToken} />
                  <MeetingHistoryAvatarStack participants={meeting.participants.slice(0, 3)} participantCount={meeting.participantCount} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : history && !query.isError ? (
        <MeetingEmptyState icon={History} title="No recent meetings"
          description="Meetings you host or join will appear here." />
      ) : null}
    </section>
  );
}
