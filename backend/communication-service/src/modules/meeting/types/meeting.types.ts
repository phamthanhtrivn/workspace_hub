import { Meeting, MeetingParticipant, Prisma } from '@prisma/client';

export type MeetingParticipantPayload = MeetingParticipant;

export type MeetingWithParticipantsAndPendingCount =
  Prisma.MeetingGetPayload<{
    include: {
      participants: true;
      _count: {
        select: {
          participants: true;
        };
      };
    };
  }>;

export interface MeetingResponse
  extends Omit<MeetingWithParticipantsAndPendingCount, '_count'> {
  joinUrl: string;
  currentParticipant: MeetingParticipant | null;
  pendingJoinRequestCount: number;
}

export interface RequestJoinMeetingResult {
  participant: MeetingParticipant;
  meeting: Meeting & {
    joinUrl: string;
  };
}

export interface MeetingJoinRequestPayload {
  meetingId: string;
  userId: string;
  participant: MeetingParticipant;
}

export interface MeetingJoinDecisionPayload {
  meetingId: string;
  userId: string;
  participant: MeetingParticipant;
}

export interface MeetingAccessUpdatedPayload {
  meetingId: string;
  allowJoinWithoutApproval: boolean;
}

export interface MeetingLiveKitTokenResponse {
  serverUrl: string;
  token: string;
  roomName: string;
}
