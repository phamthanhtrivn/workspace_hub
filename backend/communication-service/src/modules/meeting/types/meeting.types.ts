import { MeetingParticipant, Prisma } from '@prisma/client';
import { UserProfileSnapshotResponse } from '../../user-profile-snapshot/types/user-profile-snapshot.types';

export type MeetingParticipantWithProfile = MeetingParticipant & {
  profile: UserProfileSnapshotResponse | null;
};

export type MeetingParticipantPayload = MeetingParticipantWithProfile;

export type MeetingWithParticipantsAndPendingCountRaw =
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

export interface MeetingResponse extends Omit<
  MeetingWithParticipantsAndPendingCountRaw,
  '_count' | 'participants'
> {
  joinUrl: string;
  participants: MeetingParticipantWithProfile[];
  currentParticipant: MeetingParticipantWithProfile | null;
  pendingJoinRequestCount: number;
}

export interface RequestJoinMeetingResult {
  participant: MeetingParticipantWithProfile;
  meeting: MeetingResponse;
}

export interface MeetingJoinRequestPayload {
  meetingId: string;
  userId: string;
  participant: MeetingParticipantWithProfile;
}

export interface MeetingJoinDecisionPayload {
  meetingId: string;
  userId: string;
  participant: MeetingParticipantWithProfile;
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
