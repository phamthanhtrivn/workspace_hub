import { Injectable } from '@nestjs/common';
import {
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  MeetingType,
} from '@prisma/client';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';

@Injectable()
export class MeetingPresenterService {
  constructor(
    private readonly liveKitService: LiveKitService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
  ) {}

  async toMeetingParticipantSocketPayload(
    meetingId: string,
    participant: {
      id: string;
      meetingId: string;
      userId: string;
      role: MeetingRole;
      status: MeetingParticipantStatus;
      joinedAt: Date | null;
      leftAt?: Date | null;
      lastReadMessageId?: string | null;
      lastReadAt?: Date | null;
      updatedAt: Date;
    },
  ) {
    const [enrichedParticipant] =
      await this.userProfileSnapshotService.attachProfilesToMembers([
        participant,
      ]);

    return {
      ...this.toMeetingParticipantListItem(enrichedParticipant),
      meetingId,
    };
  }

  toMeetingParticipantListItem(participant: {
    id: string;
    meetingId: string;
    userId: string;
    role: MeetingRole;
    status: MeetingParticipantStatus;
    joinedAt: Date | null;
    leftAt?: Date | null;
    lastReadMessageId?: string | null;
    lastReadAt?: Date | null;
    updatedAt: Date;
    profile?: unknown;
  }) {
    return {
      id: participant.id,
      meetingId: participant.meetingId,
      userId: participant.userId,
      role: participant.role,
      status: participant.status,
      joinedAt: participant.joinedAt?.toISOString() ?? null,
      leftAt: participant.leftAt?.toISOString() ?? null,
      lastReadMessageId: participant.lastReadMessageId ?? null,
      lastReadAt: participant.lastReadAt?.toISOString() ?? null,
      updatedAt: participant.updatedAt.toISOString(),
      profile: participant.profile ?? null,
    };
  }

  toMeetingParticipantViewPreferenceItem(preference: {
    meetingId: string;
    viewerUserId: string;
    targetUserId: string;
    audioMuted: boolean;
    pinned: boolean;
    updatedAt: Date;
  }) {
    return {
      meetingId: preference.meetingId,
      viewerUserId: preference.viewerUserId,
      targetUserId: preference.targetUserId,
      audioMuted: preference.audioMuted,
      pinned: preference.pinned,
      updatedAt: preference.updatedAt.toISOString(),
    };
  }

  toJoinRequestSocketPayload(
    meetingId: string,
    request: {
      id: string;
      userId: string;
      status: MeetingParticipantStatus;
      updatedAt: Date;
    },
  ) {
    return {
      id: request.id,
      meetingId,
      userId: request.userId,
      status: request.status,
      requestedAt: request.updatedAt.toISOString(),
    };
  }

  toMeetingRoomResponse(
    meeting: {
      id: string;
      roomName: string;
      joinToken: string;
      type: MeetingType;
      status: MeetingStatus;
      autoAdmit: boolean;
      startedAt: Date | null;
      createdAt: Date;
    },
    participantRole: MeetingRole,
    token: string,
    chatMuted = false,
  ) {
    return {
      meeting: {
        id: meeting.id,
        roomName: meeting.roomName,
        joinToken: meeting.joinToken,
        type: meeting.type,
        status: meeting.status,
        autoAdmit: meeting.autoAdmit,
        startedAt: meeting.startedAt?.toISOString() ?? null,
        createdAt: meeting.createdAt.toISOString(),
        participantRole,
        chatMuted,
      },
      livekit: {
        serverUrl: this.liveKitService.getServerUrl(),
        token,
      },
    };
  }
}
