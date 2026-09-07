"use client";

import { useUpdateMeetingSettings } from "@/features/meeting/hooks/useMeetingAdmission";
import type { MeetingRoomSettingsPanelProps } from "../../../types/meeting.types";
import {
  MeetingAutoAdmitToggle,
  MeetingAutoAdmitToggleVariant,
} from "../../common/meeting-auto-admit-toggle";
import { MeetingParticipantChatToggle } from "../../common/meeting-participant-chat-toggle";
import { MeetingScreenShareToggle } from "../../common/meeting-screen-share-toggle";
import { MeetingRoomShareLink } from "./meeting-room-share-link";
import { canManageMeetingAdmission } from "@/features/meeting/utils/meeting-room.utils";

export function MeetingRoomSettingsPanel({
  joinToken,
  participantRole,
  autoAdmit,
  onAutoAdmitChange,
  chatEnabled,
  onChatEnabledChange,
  screenShareEnabled,
  onScreenShareEnabledChange,
}: MeetingRoomSettingsPanelProps) {
  const canManageSettings = canManageMeetingAdmission(participantRole);
  const updateSettingsMutation = useUpdateMeetingSettings(joinToken);

  const handleAutoAdmitChange = (nextAutoAdmit: boolean) => {
    onAutoAdmitChange(nextAutoAdmit);
    updateSettingsMutation.mutate({ autoAdmit: nextAutoAdmit }, {
      onError: () => onAutoAdmitChange(!nextAutoAdmit),
    });
  };

  const handleChatEnabledChange = (nextChatEnabled: boolean) => {
    onChatEnabledChange(nextChatEnabled);
    updateSettingsMutation.mutate(
      { chatEnabled: nextChatEnabled },
      {
        onError: () => onChatEnabledChange(!nextChatEnabled),
      },
    );
  };

  const handleScreenShareEnabledChange = (nextScreenShareEnabled: boolean) => {
    onScreenShareEnabledChange(nextScreenShareEnabled);
    updateSettingsMutation.mutate(
      { screenShareEnabled: nextScreenShareEnabled },
      {
        onError: () => onScreenShareEnabledChange(!nextScreenShareEnabled),
      },
    );
  };

  return (
    <div className="mt-4 flex h-screen flex-col justify-between">
      {canManageSettings && (
        <div className="flex flex-col gap-3">
          <MeetingAutoAdmitToggle
            checked={autoAdmit}
            disabled={updateSettingsMutation.isPending}
            onCheckedChange={handleAutoAdmitChange}
            variant={MeetingAutoAdmitToggleVariant.DARK}
          />
          <MeetingParticipantChatToggle
            checked={chatEnabled}
            disabled={updateSettingsMutation.isPending}
            onCheckedChange={handleChatEnabledChange}
            variant={MeetingAutoAdmitToggleVariant.DARK}
          />
          <MeetingScreenShareToggle
            checked={screenShareEnabled}
            disabled={updateSettingsMutation.isPending}
            onCheckedChange={handleScreenShareEnabledChange}
            variant={MeetingAutoAdmitToggleVariant.DARK}
          />
        </div>
      )}
      <MeetingRoomShareLink joinToken={joinToken} />
    </div>
  );
}
