import { MeetingParticipant, Prisma } from '@prisma/client';
import { UserProfileSnapshotResponse } from '../../user-profile-snapshot/types/user-profile-snapshot.types';

export type MeetingParticipantWithProfile = MeetingParticipant & {
  profile: UserProfileSnapshotResponse | null;
};

export type MeetingParticipantPayload = MeetingParticipantWithProfile;

export interface MeetingPaginationQuery {
  search?: string;
  page?: string;
  limit?: string;
}

export interface MeetingPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedMeetingParticipantsResponse {
  items: MeetingParticipantWithProfile[];
  pagination: MeetingPaginationMeta;
}

export interface ApproveAllMeetingJoinRequestsResponse {
  approvedCount: number;
  participants: MeetingParticipantWithProfile[];
}

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

export interface MeetingParticipantLeftPayload {
  meetingId: string;
  userId: string;
  participant: MeetingParticipantWithProfile;
}

export interface MeetingParticipantRoleUpdatedPayload {
  meetingId: string;
  userId: string;
  participant: MeetingParticipantWithProfile;
}

export interface MeetingParticipantRemovedPayload {
  meetingId: string;
  userId: string;
  participant: MeetingParticipantWithProfile;
}

export interface MeetingEndedPayload {
  meetingId: string;
  endedBy: string;
}

export interface MeetingLiveKitTokenResponse {
  serverUrl: string;
  token: string;
  roomName: string;
}
