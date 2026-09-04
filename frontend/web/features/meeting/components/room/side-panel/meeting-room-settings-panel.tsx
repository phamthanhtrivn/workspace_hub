"use client";

import { useUpdateMeetingSettings } from "@/features/meeting/hooks/useMeetingAdmission";
import type { MeetingRoomSettingsPanelProps } from "../../../types/meeting.types";
import {
  MeetingAutoAdmitToggle,
  MeetingAutoAdmitToggleVariant,
} from "../../common/meeting-auto-admit-toggle";
import { MeetingRoomShareLink } from "./meeting-room-share-link";
import { canManageMeetingAdmission } from "@/features/meeting/utils/meeting-room.utils";

export function MeetingRoomSettingsPanel({
  joinToken,
  participantRole,
  autoAdmit,
  onAutoAdmitChange,
}: MeetingRoomSettingsPanelProps) {
  const canManageAdmission = canManageMeetingAdmission(participantRole);
  const updateSettingsMutation = useUpdateMeetingSettings(joinToken);

  const handleAutoAdmitChange = (nextAutoAdmit: boolean) => {
    onAutoAdmitChange(nextAutoAdmit);
    updateSettingsMutation.mutate(nextAutoAdmit, {
      onError: () => onAutoAdmitChange(!nextAutoAdmit),
    });
  };

  return (
    <div className="mt-4 flex h-screen flex-col justify-between">
      {canManageAdmission && (
        <MeetingAutoAdmitToggle
          checked={autoAdmit}
          disabled={updateSettingsMutation.isPending}
          onCheckedChange={handleAutoAdmitChange}
          variant={MeetingAutoAdmitToggleVariant.DARK}
        />
      )}
      <MeetingRoomShareLink joinToken={joinToken} />
    </div>
  );
}
