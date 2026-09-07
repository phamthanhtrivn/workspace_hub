"use client";

import { CalendarClock, UsersRound } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingStatusTag } from "../common/meeting-status-tag";
import type { MeetingHistoryItem } from "../../types/meeting.types";
import { MeetingJoinTokenCopyButton } from "./meeting-join-token-copy-button";
import {
  formatMeetingHistoryStartTime,
  getMeetingHistoryTitleId,
} from "../../utils/meeting-history.utils";

interface MeetingHistoryListRowProps {
  meeting: MeetingHistoryItem;
}

export function MeetingHistoryListRow({ meeting }: MeetingHistoryListRowProps) {
  const intl = useAppIntl();

  return (
    <article className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1.35fr)_minmax(11rem,0.8fr)_7rem] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[#E9F2FF] text-[#0052CC]">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-[#172B4D]">
            {intl.formatMessage({ id: getMeetingHistoryTitleId(meeting) })}
          </h3>
          <MeetingJoinTokenCopyButton
            className="mt-1"
            iconClassName="h-3.5 w-3.5"
            joinToken={meeting.joinToken}
          />
        </div>
      </div>

      <div className="grid gap-2 text-xs font-bold text-slate-500">
        <span>{formatMeetingHistoryStartTime(meeting.startedAt, intl)}</span>
        <span className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-[#0052CC]" />
          {intl.formatMessage(
            { id: "meeting.history.participantCount" },
            { count: meeting.participantCount },
          )}
        </span>
      </div>

      <div className="flex items-center justify-start sm:justify-end">
        <MeetingStatusTag className="w-28" status={meeting.status} />
      </div>
    </article>
  );
}
