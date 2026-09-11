import { randomBytes, randomUUID } from 'crypto';
import { MeetingParticipantStatus, MeetingRole } from '@prisma/client';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';

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
    participantStatus === MeetingParticipantStatus.JOINED ||
    participantStatus === MeetingParticipantStatus.LEFT
  );
}

export function canBypassMeetingPassword({
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
    participantStatus === MeetingParticipantStatus.JOINED ||
    participantStatus === MeetingParticipantStatus.LEFT
  );
}

export function getTerminalMeetingMessage(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('status' in payload)) {
    return null;
  }

  if (payload.status === 'ENDED') {
    return MEETING_ERROR_MESSAGES.MEETING_ALREADY_ENDED;
  }

  if (payload.status === 'CANCELLED') {
    return MEETING_ERROR_MESSAGES.MEETING_CANCELLED;
  }

  return null;
}
