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
    <article className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-card p-4 text-foreground transition hover:border-border">
      <span className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary-soft text-info ring-1 ring-ring">
          <CalendarClock className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="line-clamp-2 text-xl font-semibold leading-tight">
            {getMeetingHistoryTitle(meeting)}
          </p>
        </div>
        <MeetingStatusTag status={meeting.status} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background p-3">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-[13px] font-semibold tabular-nums text-muted-foreground">
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
