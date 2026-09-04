"use client";

import { X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingRoomPanel } from "../../../types/meeting.types";
import type { MeetingRoomSidePanelProps } from "../../../types/meeting.types";
import { MeetingRoomPanelContent } from "./meeting-room-panel-content";
import { getPanelTitleLabelId } from "@/features/meeting/utils/meeting-room.utils";

export function MeetingRoomDesktopSidePanel({
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
    <aside className="hidden min-h-0 w-80 shrink-0 flex-col border-l border-white/10 bg-[#0d1420] p-4 lg:flex">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">
          {intl.formatMessage({ id: getPanelTitleLabelId(activePanel) })}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={intl.formatMessage({ id: "app.close" })}
          className="grid h-9 w-9 place-items-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
    </aside>
  );
}
