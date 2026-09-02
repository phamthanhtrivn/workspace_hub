"use client";

import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { MeetingRoomSettingsPanelProps } from "../../../types/meeting.types";
import { MeetingRoomShareLink } from "./meeting-room-share-link";
import { PARTICIPANT_ROLE } from "@/features/meeting/types/meeting.constants";

export function MeetingRoomSettingsPanel({
  joinToken,
  participantRole,
  participantCount,
}: MeetingRoomSettingsPanelProps) {
  const intl = useAppIntl();
  const isHost = participantRole === PARTICIPANT_ROLE.HOST;

  return (
    <div className="mt-4 space-y-3">
      {isHost && (
        <div className="rounded-lg bg-white/6 p-4 ring-1 ring-white/8">
          <p className="text-sm font-black text-slate-100">
            {intl.formatMessage({
              id: "meeting.room.panel.autoAdminTitle",
            })}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
            {intl.formatMessage(
              {
                id: "meeting.room.panel.autoAdminDescription",
              },
              { count: participantCount },
            )}
          </p>
        </div>
      )}
      <MeetingRoomShareLink joinToken={joinToken} />
    </div>
  );
}
