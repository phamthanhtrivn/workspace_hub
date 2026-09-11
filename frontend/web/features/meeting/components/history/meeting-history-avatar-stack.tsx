"use client";

import { AvatarFallback } from "../common/avatar-fallback";
import type { MeetingParticipantResponse } from "../../types/meeting.types";

interface MeetingHistoryAvatarStackProps {
  participants: MeetingParticipantResponse[];
  participantCount: number;
}

function getParticipantName(participant: MeetingParticipantResponse) {
  return (
    participant.profile?.fullName ||
    participant.profile?.email ||
    participant.userId
  );
}

export function MeetingHistoryAvatarStack({
  participants,
  participantCount,
}: MeetingHistoryAvatarStackProps) {
  const overflowCount = Math.max(0, participantCount - participants.length);

  return (
    <div className="flex items-center">
      {participants.map((participant, index) => {
        const displayName = getParticipantName(participant);
        const avatarUrl = participant.profile?.avatarUrl;

        return avatarUrl ? (
          <span
            key={participant.id}
            aria-label={displayName}
            role="img"
            className="h-9 w-9 shrink-0 rounded-full bg-cover bg-center ring-1 ring-[#15192a]"
            style={{
              backgroundImage: `url("${avatarUrl}")`,
              marginLeft: index === 0 ? 0 : -10,
              zIndex: participants.length - index,
            }}
          />
        ) : (
          <AvatarFallback
            key={participant.id}
            label={displayName}
            className="h-9 w-9 bg-slate-200 ring-1 ring-[#15192a]"
            iconClassName="h-4 w-4"
            style={{
              marginLeft: index === 0 ? 0 : -10,
              zIndex: participants.length - index,
            }}
          />
        );
      })}
      {overflowCount > 0 ? (
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#273266] text-xs font-black text-white ring-2 ring-[#15192a]"
          style={{ marginLeft: -10 }}
        >
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}
