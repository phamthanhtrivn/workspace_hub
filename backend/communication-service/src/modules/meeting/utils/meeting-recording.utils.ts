import { HttpException } from '@nestjs/common';
import {
  MeetingParticipantStatus,
  MeetingRecordingStatus,
  MeetingRole,
} from '@prisma/client';

export const ACTIVE_RECORDING_STATUSES: MeetingRecordingStatus[] = [
  MeetingRecordingStatus.STARTING,
  MeetingRecordingStatus.RECORDING,
  MeetingRecordingStatus.PAUSING,
  MeetingRecordingStatus.PAUSED,
  MeetingRecordingStatus.PROCESSING,
];

export const RECORDING_CAPACITY_STATUSES = ACTIVE_RECORDING_STATUSES.filter(
  (status) => status !== MeetingRecordingStatus.PAUSED,
);

export function recordingSegmentKey(
  meetingId: string,
  recordingId: string,
  index: number,
) {
  return `recordings/${meetingId}/${recordingId}/part-${index.toString().padStart(4, '0')}.mp4`;
}

export function recordingError(
  status: number,
  code: string,
  message: string,
): never {
  throw new HttpException({ message, code }, status);
}

export function recordingCapabilities(
  participant:
    | {
        role: MeetingRole;
        status: MeetingParticipantStatus;
        canRecord: boolean;
      }
    | undefined,
  recording?: { startedBy: string; stopRequestedAt: Date | null } | null,
  userId?: string,
) {
  const joined = participant?.status === MeetingParticipantStatus.JOINED;
  const moderator =
    joined &&
    (participant.role === MeetingRole.HOST ||
      participant.role === MeetingRole.COHOST);
  const permitted = joined && (moderator || participant.canRecord);
  return {
    canStart: Boolean(permitted && !recording),
    canStop: Boolean(
      permitted &&
      recording &&
      !recording.stopRequestedAt &&
      (moderator || recording.startedBy === userId),
    ),
    canGrantRecord: Boolean(joined && participant.role === MeetingRole.HOST),
  };
}

export function egressDate(nanoseconds: bigint): Date | null {
  return nanoseconds > 0n ? new Date(Number(nanoseconds / 1_000_000n)) : null;
}
