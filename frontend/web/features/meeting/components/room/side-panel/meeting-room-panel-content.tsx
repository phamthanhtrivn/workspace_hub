"use client";

import { MeetingRoomPanel } from "../../../types/meeting.types";
import type { MeetingRoomPanelContentProps } from "../../../types/meeting.types";
import { MeetingParticipantsPanel } from "./meeting-participants-panel";
import { MeetingRoomChatPanel } from "./meeting-room-chat-panel";
import { MeetingRoomSettingsPanel } from "./meeting-room-settings-panel";

export function MeetingRoomPanelContent({
  activePanel,
  joinToken,
  participantRole,
  participantCount,
}: MeetingRoomPanelContentProps) {
  if (activePanel === MeetingRoomPanel.PARTICIPANTS) {
    return <MeetingParticipantsPanel />;
  }

  if (activePanel === MeetingRoomPanel.CHAT) {
    return <MeetingRoomChatPanel />;
  }

  return (
    <MeetingRoomSettingsPanel
      joinToken={joinToken}
      participantRole={participantRole}
      participantCount={participantCount}
    />
  );
}
