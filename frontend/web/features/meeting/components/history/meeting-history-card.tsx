"use client";

import { CalendarClock } from "lucide-react";
import { MeetingStatusTag } from "../common/meeting-status-tag";
import type { MeetingHistoryItem } from "../../types/meeting.types";
import { MeetingHistoryAvatarStack } from "./meeting-history-avatar-stack";
import { MeetingJoinTokenCopyButton } from "./meeting-join-token-copy-button";
import {
  formatMeetingHistoryStartTime,
  getMeetingHistoryTitle,
} from "../../utils/meeting-history.utils";

interface MeetingHistoryCardProps {
  meeting: MeetingHistoryItem;
}

export function MeetingHistoryCard({ meeting }: MeetingHistoryCardProps) {
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-control bg-secondary text-secondary-foreground">
          <CalendarClock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="line-clamp-2 break-words text-base font-semibold leading-6">
            {getMeetingHistoryTitle(meeting)}
          </h3>
        </div>
        <MeetingStatusTag status={meeting.status} />
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatMeetingHistoryStartTime(meeting.startedAt)}
            </p>
            <MeetingJoinTokenCopyButton joinToken={meeting.joinToken} />
          </div>
          <div className="shrink-0 pb-0.5">
            <MeetingHistoryAvatarStack
              participants={meeting.participants}
              participantCount={meeting.participantCount}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
