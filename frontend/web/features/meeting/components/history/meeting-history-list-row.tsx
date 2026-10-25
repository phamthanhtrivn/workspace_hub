"use client";

import { CalendarClock, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { MeetingStatusTag } from "../common/meeting-status-tag";
import type { MeetingHistoryItem } from "../../types/meeting.types";
import { MeetingJoinTokenCopyButton } from "./meeting-join-token-copy-button";
import {
  formatMeetingHistoryStartTime,
  getMeetingHistoryTitle,
} from "../../utils/meeting-history.utils";

interface MeetingHistoryListRowProps {
  meeting: MeetingHistoryItem;
  actions?: ReactNode;
  selection?: ReactNode;
}

export function MeetingHistoryListRow({ meeting, actions, selection }: MeetingHistoryListRowProps) {
  return (
    <article className="grid min-w-0 gap-4 rounded-panel border border-border bg-card p-4 text-card-foreground @min-[760px]/meeting-content:grid-cols-[minmax(0,1.35fr)_minmax(11rem,0.8fr)_10rem] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        {selection}
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-secondary text-secondary-foreground">
          <CalendarClock className="h-5 w-5" aria-hidden />
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

      <div className="grid gap-2 text-xs tabular-nums text-muted-foreground">
        <span>{formatMeetingHistoryStartTime(meeting.startedAt)}</span>
        <span className="flex items-center gap-2">
          <UsersRound className="h-4 w-4" aria-hidden />
          {meeting.participantCount}{" "}
          {meeting.participantCount === 1 ? "participant" : "participants"}
        </span>
      </div>

      <div className="flex items-center justify-start gap-1 sm:justify-end">
        <MeetingStatusTag className="w-28" status={meeting.status} />
        {actions}
      </div>
    </article>
  );
}
