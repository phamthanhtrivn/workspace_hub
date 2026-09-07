"use client";

import { CalendarClock, Hash } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingStatusTag } from "../common/meeting-status-tag";
import type { MeetingHistoryItem } from "../../types/meeting.types";
import { MeetingHistoryAvatarStack } from "./meeting-history-avatar-stack";
import { formatMeetingHistoryStartTime, getMeetingHistoryTitleId } from "../../utils/meeting-history.utils";

interface MeetingHistoryCardProps {
  meeting: MeetingHistoryItem;
}

export function MeetingHistoryCard({ meeting }: MeetingHistoryCardProps) {
  const intl = useAppIntl();

  return (
    <article className="relative flex min-h-60 flex-col justify-between overflow-hidden rounded-lg border border-slate-200 bg-white p-5 text-[#172B4D] shadow-[0_18px_44px_rgba(15,40,84,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_22px_56px_rgba(15,40,84,0.12)]">
      <span className="absolute inset-x-0 top-0 h-1 bg-[#0052CC]" />
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-md bg-[#E9F2FF] text-[#0052CC] ring-1 ring-blue-100">
          <CalendarClock className="h-6 w-6" />
        </span>
        <MeetingStatusTag status={meeting.status} />
      </div>

      <div>
        <p className="text-2xl font-black leading-tight">
          {intl.formatMessage({ id: getMeetingHistoryTitleId(meeting) })}
        </p>
        <p className="mt-2 text-sm font-bold text-slate-500">
          {formatMeetingHistoryStartTime(meeting.startedAt, intl)}
        </p>
      </div>

      <div className="space-y-4">
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-500">
          <Hash className="h-4 w-4 shrink-0 text-[#0052CC]" />
          <span className="truncate font-mono">{meeting.joinToken}</span>
        </span>
        <MeetingHistoryAvatarStack
          participants={meeting.participants}
          participantCount={meeting.participantCount}
        />
      </div>
    </article>
  );
}
