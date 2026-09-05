"use client";

import { X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingRoomPanel } from "../../../types/meeting.types";
import type { MeetingRoomSidePanelProps } from "../../../types/meeting.types";
import { MeetingRoomPanelContent } from "./meeting-room-panel-content";
import { getPanelTitleLabelId } from "@/features/meeting/utils/meeting-room.utils";
import { MeetingChatNotificationToggleButton } from "./meeting-chat-notification-toggle-button";

export function MeetingRoomDesktopSidePanel({
  activePanel,
  joinToken,
  meetingId,
  participantRole,
  participantCount,
  autoAdmit,
  onAutoAdmitChange,
  chatMuted,
  isChatNotificationPreferencePending,
  onChatMutedChange,
  onClose,
}: MeetingRoomSidePanelProps) {
  const intl = useAppIntl();

  if (activePanel === MeetingRoomPanel.NONE) return null;

  return (
    <aside className="hidden min-h-0 w-100 shrink-0 flex-col border-l border-white/10 bg-[#0d1420] p-4 lg:flex">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">
          {intl.formatMessage({ id: getPanelTitleLabelId(activePanel) })}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {activePanel === MeetingRoomPanel.CHAT ? (
            <MeetingChatNotificationToggleButton
              muted={chatMuted}
              disabled={isChatNotificationPreferencePending}
              onMutedChange={onChatMutedChange}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-60"
            />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label={intl.formatMessage({ id: "app.close" })}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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
