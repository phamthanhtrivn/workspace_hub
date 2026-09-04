import { randomBytes, randomUUID } from 'crypto';
import { MeetingParticipantStatus, MeetingRole } from '@prisma/client';

export function createRoomName() {
  return `meeting_${randomUUID()}`;
}

export function createJoinToken() {
  return randomBytes(8).toString('base64url');
}

export function canJoinLockedMeeting({
  hostId,
  userId,
  role,
  participantStatus,
}: {
  hostId: string;
  userId: string;
  role: MeetingRole;
  participantStatus?: MeetingParticipantStatus | null;
}) {
  return (
    hostId === userId ||
    role === MeetingRole.HOST ||
    role === MeetingRole.COHOST ||
    participantStatus === MeetingParticipantStatus.APPROVED ||
    participantStatus === MeetingParticipantStatus.JOINED ||
    participantStatus === MeetingParticipantStatus.LEFT
  );
}
