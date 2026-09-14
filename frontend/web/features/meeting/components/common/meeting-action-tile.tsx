"use client";

import { cn } from "@/lib/utils";
import {
  meetingActionIconById,
  meetingActionToneClassByTone,
  MeetingDashboardActionId,
  MeetingDashboardTone,
} from "../../types/meeting.constants";

interface MeetingActionTileProps {
  actionId: MeetingDashboardActionId;
  title: string;
  description: string;
  tone: MeetingDashboardTone;
  enabled: boolean;
  onClick?: () => void;
}

export function MeetingActionTile({
  actionId,
  title,
  description,
  tone,
  enabled,
  onClick,
}: MeetingActionTileProps) {
  const Icon = meetingActionIconById[actionId];
  const toneClass = meetingActionToneClassByTone[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={cn(
        "group flex min-h-44 flex-col items-start justify-between rounded-lg p-4 text-left text-white shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2",
        toneClass,
        enabled
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          : "cursor-not-allowed opacity-80",
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-md bg-white/22 text-white ring-1 ring-white/18">
        <Icon className="h-6 w-6" />
      </span>

      <span className="space-y-2">
        <span className="block text-xl font-black leading-tight">
          {title}
        </span>
        <span className="block text-sm font-semibold leading-5 text-white/85">
          {description}
        </span>
        {!enabled ? (
          <span className="inline-flex rounded-md bg-white/20 px-2 py-1 text-xs font-black text-white">
            Soon
          </span>
        ) : null}
      </span>
    </button>
  );
}
