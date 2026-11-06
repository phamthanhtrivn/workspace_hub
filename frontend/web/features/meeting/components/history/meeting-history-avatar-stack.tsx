"use client";

import { UserAvatar } from "@/components/common/user-avatar";

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

        return <UserAvatar key={participant.id} src={avatarUrl} alt={displayName} className="h-9 w-9 shrink-0 rounded-full ring-1 ring-ring" style={{marginLeft: index === 0 ? 0 : -10, zIndex: participants.length - index}} />;
      })}
      {overflowCount > 0 ? (
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card text-xs font-semibold text-foreground ring-2 ring-ring"
          style={{ marginLeft: -10 }}
        >
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}
