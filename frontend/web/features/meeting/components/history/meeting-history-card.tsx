"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { MEETING_ROUTES } from "../../types/meeting.constants";
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
  actions?: ReactNode;
  selection?: ReactNode;
}

export function MeetingHistoryCard({ meeting, actions, selection }: MeetingHistoryCardProps) {
  return (
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-card p-4 text-card-foreground">
      {meeting.status === "LIVE" && (
        <Link
          href={MEETING_ROUTES.room(meeting.joinToken)}
          aria-label={`Join ${getMeetingHistoryTitle(meeting)}`}
          className="absolute inset-0 z-10 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        />
      )}
      <div className="flex items-center gap-3">
        {selection}
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-control bg-secondary text-secondary-foreground">
          <CalendarClock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="line-clamp-2 break-words text-base font-semibold leading-6">
            {getMeetingHistoryTitle(meeting)}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <MeetingStatusTag status={meeting.status} />
          {actions}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatMeetingHistoryStartTime(meeting.startedAt)}
            </p>
            <div className="relative z-20 w-fit">
              <MeetingJoinTokenCopyButton joinToken={meeting.joinToken} />
            </div>
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
