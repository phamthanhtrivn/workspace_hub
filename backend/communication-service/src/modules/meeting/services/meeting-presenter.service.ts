import { Injectable } from '@nestjs/common';
import {
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  MeetingType,
} from '@prisma/client';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { canJoinLockedMeeting } from '../utils/meeting.utils';

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

  toMeetingHistoryItem(
    meeting: {
      id: string;
      joinToken: string;
      title: string;
      type: MeetingType;
      status: MeetingStatus;
      scheduledStartAt?: Date | null;
      scheduledEndAt?: Date | null;
      startedAt: Date | null;
      endedAt: Date | null;
      createdAt: Date;
    },
    myParticipant: {
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
    },
    participants: Array<{
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
    }>,
    participantCount: number,
  ) {
    return {
      id: meeting.id,
      joinToken: meeting.joinToken,
      title: meeting.title,
      type: meeting.type,
      status: meeting.status,
      scheduledStartAt: meeting.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: meeting.scheduledEndAt?.toISOString() ?? null,
      startedAt: meeting.startedAt?.toISOString() ?? null,
      endedAt: meeting.endedAt?.toISOString() ?? null,
      createdAt: meeting.createdAt.toISOString(),
      myParticipant: this.toMeetingParticipantListItem(myParticipant),
      participants: participants.map((participant) =>
        this.toMeetingParticipantListItem(participant),
      ),
      participantCount,
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

  toMeetingAccessResponse(
    meeting: {
      id: string;
      joinToken: string;
      title?: string;
      description?: string | null;
      type: MeetingType;
      status: MeetingStatus;
      hostId: string;
      autoAdmit: boolean;
      chatEnabled: boolean;
      screenShareEnabled: boolean;
      activeScreenShareUserId: string | null;
      screenShareStartedAt: Date | null;
      scheduledStartAt?: Date | null;
      scheduledEndAt?: Date | null;
      passwordHash?: string | null;
      hasApprovedJoinRequest?: boolean;
      participants: Array<{
        role: MeetingRole;
        status: MeetingParticipantStatus;
        chatMuted?: boolean;
      }>;
    },
    userId: string,
  ) {
    const existingParticipant = meeting.participants[0];
    const participantRole =
      existingParticipant?.role ??
      (meeting.hostId === userId ? MeetingRole.HOST : MeetingRole.PARTICIPANT);
    const canJoinWithoutApproval =
      meeting.autoAdmit ||
      canJoinLockedMeeting({
        hostId: meeting.hostId,
        userId,
        role: participantRole,
        participantStatus: existingParticipant?.status,
      }) ||
      (existingParticipant?.status === MeetingParticipantStatus.APPROVED &&
        meeting.hasApprovedJoinRequest === true);

    return {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      status: meeting.status,
      autoAdmit: meeting.autoAdmit,
      chatEnabled: meeting.chatEnabled,
      screenShareEnabled: meeting.screenShareEnabled,
      canJoinWithoutApproval,
      participantRole,
      participantStatus: existingParticipant?.status ?? null,
      chatMuted: existingParticipant?.chatMuted ?? false,
      activeScreenShareUserId: meeting.activeScreenShareUserId,
      screenShareStartedAt: meeting.screenShareStartedAt?.toISOString() ?? null,
      title: meeting.title ?? null,
      description: meeting.description ?? null,
      type: meeting.type,
      scheduledStartAt: meeting.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: meeting.scheduledEndAt?.toISOString() ?? null,
      canStart:
        meeting.hostId === userId ||
        participantRole === MeetingRole.HOST ||
        participantRole === MeetingRole.COHOST,
      requiresPassword: Boolean(meeting.passwordHash),
      errorCode: this.getMeetingAccessErrorCode(meeting.status),
    };
  }

  toMeetingRoomResponse(
    meeting: {
      id: string;
      roomName: string;
      joinToken: string;
      type: MeetingType;
      status: MeetingStatus;
      title?: string;
      description?: string | null;
      autoAdmit: boolean;
      chatEnabled: boolean;
      screenShareEnabled: boolean;
      activeScreenShareUserId: string | null;
      screenShareStartedAt: Date | null;
      scheduledStartAt?: Date | null;
      scheduledEndAt?: Date | null;
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
        title: meeting.title ?? null,
        description: meeting.description ?? null,
        autoAdmit: meeting.autoAdmit,
        chatEnabled: meeting.chatEnabled,
        screenShareEnabled: meeting.screenShareEnabled,
        activeScreenShareUserId: meeting.activeScreenShareUserId,
        screenShareStartedAt:
          meeting.screenShareStartedAt?.toISOString() ?? null,
        scheduledStartAt: meeting.scheduledStartAt?.toISOString() ?? null,
        scheduledEndAt: meeting.scheduledEndAt?.toISOString() ?? null,
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

  private getMeetingAccessErrorCode(status: MeetingStatus): string | null {
    if (status === MeetingStatus.SCHEDULED) {
      return 'MEETING_NOT_STARTED';
    }
    if (status === MeetingStatus.ENDED) {
      return 'MEETING_ALREADY_ENDED';
    }
    if (status === MeetingStatus.CANCELLED) {
      return 'MEETING_CANCELLED';
    }
    return null;
  }
}
