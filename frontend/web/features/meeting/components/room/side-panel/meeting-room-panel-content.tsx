"use client";

import { MeetingRoomPanel } from "../../../types/meeting.types";
import type { MeetingRoomPanelContentProps } from "../../../types/meeting.types";
import { MeetingParticipantsPanel } from "./meeting-participants-panel";
import { MeetingRoomAdmissionPanel } from "./meeting-room-admission-panel";
import { MeetingRoomChatPanel } from "./meeting-room-chat-panel";
import { MeetingRoomSettingsPanel } from "./meeting-room-settings-panel";

export function MeetingRoomPanelContent({
  activePanel,
  joinToken,
  meetingId,
  participantRole,
  participantCount,
  autoAdmit,
  onAutoAdmitChange,
  mutedParticipantIds,
  pinnedParticipantId,
  isParticipantViewPreferencePending,
  onToggleParticipantAudioMute,
  onToggleParticipantPin,
}: MeetingRoomPanelContentProps) {
  if (activePanel === MeetingRoomPanel.PARTICIPANTS) {
    return (
      <MeetingParticipantsPanel
        joinToken={joinToken}
        participantRole={participantRole}
        mutedParticipantIds={mutedParticipantIds}
        pinnedParticipantId={pinnedParticipantId}
        isParticipantViewPreferencePending={
          isParticipantViewPreferencePending
        }
        onToggleParticipantAudioMute={onToggleParticipantAudioMute}
        onToggleParticipantPin={onToggleParticipantPin}
      />
    );
  }

  if (activePanel === MeetingRoomPanel.CHAT) {
    return <MeetingRoomChatPanel joinToken={joinToken} meetingId={meetingId} />;
  }

  if (activePanel === MeetingRoomPanel.ADMISSION) {
    return (
      <MeetingRoomAdmissionPanel joinToken={joinToken} meetingId={meetingId} />
    );
  }

  return (
    <MeetingRoomSettingsPanel
      joinToken={joinToken}
      participantRole={participantRole}
      participantCount={participantCount}
      autoAdmit={autoAdmit}
      onAutoAdmitChange={onAutoAdmitChange}
    />
  );
}
