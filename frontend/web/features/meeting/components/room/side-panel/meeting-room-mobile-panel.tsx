"use client";

import { X } from "lucide-react";
import { MeetingRoomPanel } from "../../../types/meeting.types";
import type { MeetingRoomSidePanelProps } from "../../../types/meeting.types";
import { MeetingRoomPanelContent } from "./meeting-room-panel-content";
import { getPanelTitle } from "@/features/meeting/utils/meeting-room.utils";
import { MeetingChatNotificationToggleButton } from "./meeting-chat-notification-toggle-button";
import { Button } from "@/components/ui/button";


export function MeetingRoomMobilePanelHeader({
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
    <div className="absolute inset-0 z-50 flex min-h-0 min-w-0 flex-col overflow-hidden bg-card p-3 @min-[1060px]/meeting-room:hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-muted-foreground ring-1 ring-border/8">
        <span>{getPanelTitle(activePanel)}</span>
        <div className="flex shrink-0 items-center gap-2">
          {activePanel === MeetingRoomPanel.CHAT ? (
            <MeetingChatNotificationToggleButton
              muted={chatMuted}
              disabled={isChatNotificationPreferencePending}
              onMutedChange={onChatMutedChange}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-md bg-accent text-muted-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
          ) : null}
          <Button variant="unstyled"
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-control bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
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
    </div>
  );
}
