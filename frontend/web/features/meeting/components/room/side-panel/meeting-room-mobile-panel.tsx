"use client";

import { X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingRoomPanel } from "../../../types/meeting.types";
import type { MeetingRoomSidePanelProps } from "../../../types/meeting.types";
import { MeetingRoomPanelContent } from "./meeting-room-panel-content";
import { getPanelTitleLabelId } from "@/features/meeting/utils/meeting-room.utils";

export function MeetingRoomMobilePanelHeader({
  activePanel,
  joinToken,
  meetingId,
  participantRole,
  participantCount,
  autoAdmit,
  onAutoAdmitChange,
  onClose,
}: MeetingRoomSidePanelProps) {
  const intl = useAppIntl();

  if (activePanel === MeetingRoomPanel.NONE) return null;

  return (
    <div className="max-h-[45dvh] overflow-y-auto border-t border-white/10 bg-[#0d1420] p-3 lg:hidden">
      <div className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-2 text-sm font-black text-slate-200 ring-1 ring-white/8">
        <span>{intl.formatMessage({ id: getPanelTitleLabelId(activePanel) })}</span>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md bg-white/8"
          aria-label={intl.formatMessage({ id: "app.close" })}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <MeetingRoomPanelContent
        activePanel={activePanel}
        joinToken={joinToken}
        meetingId={meetingId}
        participantRole={participantRole}
        participantCount={participantCount}
        autoAdmit={autoAdmit}
        onAutoAdmitChange={onAutoAdmitChange}
      />
    </div>
  );
}
