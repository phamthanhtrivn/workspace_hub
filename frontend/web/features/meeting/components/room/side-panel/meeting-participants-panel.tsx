"use client";

import { useParticipants } from "@livekit/components-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import { getInitials, getRoleLabelId, parseParticipantMetadata } from "@/features/meeting/utils/meeting-room.utils";

export function MeetingParticipantsPanel() {
  const intl = useAppIntl();
  const authUser = useAppSelector((state) => state.auth);
  const participants = useParticipants();

  return (
    <div className="mt-4 space-y-2">
      {participants.map((participant) => {
        const metadata = parseParticipantMetadata(participant);
        const displayName =
          participant.name ||
          (participant.isLocal ? authUser.fullName || authUser.email : null) ||
          participant.identity ||
          intl.formatMessage({ id: "app.user" });
        const avatarUrl = participant.isLocal
          ? authUser.avatarUrl || metadata.avatarUrl
          : metadata.avatarUrl;

        return (
          <div
            key={participant.identity}
            className="flex items-center gap-3 rounded-lg bg-white/6 p-3 ring-1 ring-white/8"
          >
            {avatarUrl ? (
              <span
                aria-label={displayName}
                role="img"
                className="h-10 w-10 rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url("${avatarUrl}")` }}
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-xs font-black">
                {getInitials(displayName)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">
                {displayName}
              </span>
              <span className="block text-xs font-semibold text-slate-400">
                {intl.formatMessage({ id: getRoleLabelId(metadata.role) })}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
