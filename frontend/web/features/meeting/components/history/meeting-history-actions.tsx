"use client";

import { EyeOff, MoreHorizontal, RotateCcw } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MEETING_HISTORY_LABELS, MEETING_STATUS } from "../../types/meeting.constants";
import type { MeetingHistoryItem } from "../../types/meeting.types";
import { MeetingIconButton } from "../ui/meeting-icon-button";

interface MeetingHistoryActionsProps {
  meeting: MeetingHistoryItem;
  hidden: boolean;
  disabled: boolean;
  onChange: (meetingId: string, hidden: boolean) => Promise<void>;
}

export function MeetingHistoryActions({ meeting, hidden, disabled, onChange }: MeetingHistoryActionsProps) {
  if (!hidden && meeting.status !== MEETING_STATUS.ENDED && meeting.status !== MEETING_STATUS.CANCELLED) return null;
  const Icon = hidden ? RotateCcw : EyeOff;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <MeetingIconButton type="button" tone="ghost" label={MEETING_HISTORY_LABELS.actions}
          icon={MoreHorizontal} disabled={disabled} className="relative z-20 size-9" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={disabled} onClick={() => void onChange(meeting.id, !hidden)}>
          <Icon aria-hidden="true" className="size-4" />
          {hidden ? MEETING_HISTORY_LABELS.restore : MEETING_HISTORY_LABELS.hide}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
