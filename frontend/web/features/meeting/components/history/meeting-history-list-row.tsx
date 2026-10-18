"use client";

import { CalendarClock, UsersRound } from "lucide-react";
import { MeetingStatusTag } from "../common/meeting-status-tag";
import type { MeetingHistoryItem } from "../../types/meeting.types";
import { MeetingJoinTokenCopyButton } from "./meeting-join-token-copy-button";
import {
  formatMeetingHistoryStartTime,
  getMeetingHistoryTitle,
} from "../../utils/meeting-history.utils";

interface MeetingHistoryListRowProps {
  meeting: MeetingHistoryItem;
}

export function MeetingHistoryListRow({ meeting }: MeetingHistoryListRowProps) {
  return (
    <article className="grid gap-4 rounded-lg border border-border bg-card p-4 @min-[760px]/meeting-content:grid-cols-[minmax(0,1.35fr)_minmax(11rem,0.8fr)_7rem] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary-soft text-info-content">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {getMeetingHistoryTitle(meeting)}
          </h3>
          <MeetingJoinTokenCopyButton
            className="mt-1"
            iconClassName="h-3.5 w-3.5"
            joinToken={meeting.joinToken}
          />
        </div>
      </div>

      <div className="grid gap-2 text-xs font-semibold text-muted-foreground">
        <span>{formatMeetingHistoryStartTime(meeting.startedAt)}</span>
        <span className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-info-content" />
          {meeting.participantCount}{" "}
          {meeting.participantCount === 1 ? "participant" : "participants"}
        </span>
      </div>

      <div className="flex items-center justify-start sm:justify-end">
        <MeetingStatusTag className="w-28" status={meeting.status} />
      </div>
    </article>
  );
}
