"use client";

import { IconButton } from "@/components/ui/icon-button";

import { X } from "lucide-react";
import { MeetingRoomPanel } from "../../../types/meeting.types";
import type { MeetingRoomSidePanelProps } from "../../../types/meeting.types";
import { MeetingRoomPanelContent } from "./meeting-room-panel-content";
import { getPanelTitle } from "@/features/meeting/utils/meeting-room.utils";
import { MeetingChatNotificationToggleButton } from "./meeting-chat-notification-toggle-button";


export function MeetingRoomDesktopSidePanel({
  activePanel,
  joinToken,
  meetingId,
  participantRole,
  participantCount,
  autoAdmit,
  onAutoAdmitChange,
  chatEnabled,
  onChatEnabledChange,
  screenShareEnabled,
  onScreenShareEnabledChange,
  activeScreenShareUserId,
  chatMuted,
  isChatNotificationPreferencePending,
  onChatMutedChange,
  mutedParticipantIds,
  pinnedParticipantId,
  isParticipantViewPreferencePending,
  onToggleParticipantAudioMute,
  onToggleParticipantPin,
  onClose,
}: MeetingRoomSidePanelProps) {
  if (activePanel === MeetingRoomPanel.NONE) return null;

  return (
    <aside className="hidden min-h-0 min-w-0 w-[400px] shrink-0 flex-col overflow-hidden border-l border-border bg-card p-4 @min-[1060px]/meeting-room:flex">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-section-title font-semibold">
          {getPanelTitle(activePanel)}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {activePanel === MeetingRoomPanel.CHAT ? (
            <MeetingChatNotificationToggleButton
              muted={chatMuted}
              disabled={isChatNotificationPreferencePending}
              onMutedChange={onChatMutedChange}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-accent text-muted-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            />
          ) : null}
          <IconButton label="Close" showTooltip={false} size="icon-sm"
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-control bg-accent text-muted-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </IconButton>
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
        chatEnabled={chatEnabled}
        onChatEnabledChange={onChatEnabledChange}
        screenShareEnabled={screenShareEnabled}
        onScreenShareEnabledChange={onScreenShareEnabledChange}
        activeScreenShareUserId={activeScreenShareUserId}
        mutedParticipantIds={mutedParticipantIds}
        pinnedParticipantId={pinnedParticipantId}
        isParticipantViewPreferencePending={
          isParticipantViewPreferencePending
        }
        onToggleParticipantAudioMute={onToggleParticipantAudioMute}
        onToggleParticipantPin={onToggleParticipantPin}
      />
    </aside>
  );
}
