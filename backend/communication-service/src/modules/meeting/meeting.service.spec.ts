import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
} from '@prisma/client';

jest.mock('./realtime/meeting-realtime.publisher', () => ({
  MeetingRealtimePublisher: jest.fn(),
}));

import { MeetingService } from './meeting.service';
import {
  MeetingErrorMessage,
  MeetingEventTypeValue,
  MeetingParticipantRoleValue,
  MeetingParticipantStatusValue,
  MeetingStatusValue,
} from './types/meeting.enums';

describe('MeetingService permissions', () => {
  const prisma = {
    meeting: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    meetingParticipant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    meetingEvent: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    userProfileSnapshot: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const realtimePublisher = {
    accessUpdated: jest.fn(),
    joinApproved: jest.fn(),
    joinRejected: jest.fn(),
    meetingEnded: jest.fn(),
    participantRemoved: jest.fn(),
    participantRoleUpdated: jest.fn(),
  };
  const meetingLiveKitService = {
    deleteRoom: jest.fn(),
    removeParticipant: jest.fn(),
  };
  const meetingAuthorizationService = {
    assertHost: jest.fn(),
    assertModerator: jest.fn(),
    isModeratorRole: jest.fn((role: MeetingRole) =>
      [MeetingRole.HOST, MeetingRole.COHOST].includes(role),
    ),
  };
  const meetingResponseMapper = {
    enrichParticipants: jest.fn(),
    map: jest.fn(),
  };
  const meetingAuditService = {
    accessUpdated: jest.fn((tx, meetingId, actorId, allowJoinWithoutApproval) =>
      tx.meetingEvent.create({
        data: {
          meetingId,
          actorId,
          type: MeetingEventTypeValue.ACCESS_UPDATED,
          metadata: { allowJoinWithoutApproval },
        },
      }),
    ),
    autoApprovedJoinRequests: jest.fn((tx, meetingId, actorId, userIds) =>
      tx.meetingEvent.createMany({
        data: userIds.map((userId) => ({
          meetingId,
          actorId,
          type: MeetingEventTypeValue.JOIN_APPROVED,
          metadata: { userId },
        })),
      }),
    ),
    hostTransferred: jest.fn((tx, meetingId, oldHostId, newHostId) =>
      tx.meetingEvent.create({
        data: {
          meetingId,
          actorId: oldHostId,
          type: MeetingEventTypeValue.HOST_TRANSFERRED,
          metadata: { oldHostId, newHostId },
        },
      }),
    ),
    joinDecision: jest.fn((tx, meetingId, actorId, requesterId, type) =>
      tx.meetingEvent.create({
        data: {
          meetingId,
          actorId,
          type,
          metadata: { userId: requesterId },
        },
      }),
    ),
    joinRequestStateChanged: jest.fn((tx, meetingId, actorId, status) =>
      tx.meetingEvent.create({
        data: {
          meetingId,
          actorId,
          type:
            status === MeetingParticipantStatusValue.REQUESTED
              ? MeetingEventTypeValue.JOIN_REQUESTED
              : MeetingEventTypeValue.PARTICIPANT_JOINED,
          metadata: { status },
        },
      }),
    ),
    meetingEnded: jest.fn((tx, meetingId, actorId) =>
      tx.meetingEvent.create({
        data: {
          meetingId,
          actorId,
          type: MeetingEventTypeValue.ENDED,
        },
      }),
    ),
    participantLeft: jest.fn((tx, meetingId, actorId) =>
      tx.meetingEvent.create({
        data: {
          meetingId,
          actorId,
          type: MeetingEventTypeValue.PARTICIPANT_LEFT,
        },
      }),
    ),
    participantRemoved: jest.fn((tx, meetingId, actorId, removedUserId) =>
      tx.meetingEvent.create({
        data: {
          meetingId,
          actorId,
          type: MeetingEventTypeValue.PARTICIPANT_REMOVED,
          metadata: {
            removedUserId,
            status: MeetingParticipantStatusValue.REMOVED,
          },
        },
      }),
    ),
    participantRoleUpdated: jest.fn((tx, meetingId, actorId, userId, role) =>
      tx.meetingEvent.create({
        data: {
          meetingId,
          actorId,
          type: MeetingEventTypeValue.PARTICIPANT_ROLE_UPDATED,
          metadata: { userId, role },
        },
      }),
    ),
  };
  let service: MeetingService;

  const liveMeeting = {
    id: 'meeting-1',
    hostId: 'host-1',
    roomName: 'room-1',
    joinToken: 'join-token',
    status: MeetingStatus.LIVE,
  };
  const regularParticipant = {
    id: 'participant-1',
    meetingId: 'meeting-1',
    userId: 'user-1',
    role: MeetingRole.PARTICIPANT,
    status: MeetingParticipantStatus.JOINED,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    meetingAuthorizationService.assertModerator.mockResolvedValue(liveMeeting);
    meetingAuthorizationService.assertHost.mockResolvedValue(liveMeeting);
    meetingResponseMapper.enrichParticipants.mockImplementation(
      async (participants) =>
        participants.map((participant) => ({ ...participant, profile: null })),
    );
    meetingResponseMapper.map.mockImplementation(async (meeting, userId) => ({
      ...meeting,
      currentParticipant: null,
      joinUrl: `/meetings/${meeting.joinToken}`,
      pendingJoinRequestCount: 0,
      userId,
    }));
    service = new MeetingService(
      prisma as any,
      realtimePublisher as any,
      meetingLiveKitService as any,
      meetingAuthorizationService as any,
      meetingResponseMapper as any,
      meetingAuditService as any,
    );
  });

  it('allows co-host moderators to approve join requests', async () => {
    prisma.meetingParticipant.findUnique.mockResolvedValue({
      ...regularParticipant,
      status: MeetingParticipantStatus.REQUESTED,
    });
    prisma.meetingParticipant.update.mockResolvedValue(regularParticipant);

    await expect(
      service.approveJoinRequest('meeting-1', 'user-1', 'cohost-1'),
    ).resolves.toMatchObject({
      userId: 'user-1',
      status: MeetingParticipantStatus.JOINED,
    });

    expect(meetingAuthorizationService.assertModerator).toHaveBeenCalledWith(
      'meeting-1',
      'cohost-1',
    );
    expect(prisma.meetingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        meetingId: 'meeting-1',
        actorId: 'cohost-1',
        type: MeetingEventTypeValue.JOIN_APPROVED,
        metadata: { userId: 'user-1' },
      }),
    });
    expect(realtimePublisher.joinApproved).toHaveBeenCalledWith(
      'meeting-1',
      'user-1',
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('allows co-host moderators to reject join requests', async () => {
    prisma.meetingParticipant.findUnique.mockResolvedValue({
      ...regularParticipant,
      status: MeetingParticipantStatus.REQUESTED,
    });
    prisma.meetingParticipant.update.mockResolvedValue({
      ...regularParticipant,
      status: MeetingParticipantStatus.REJECTED,
    });

    await expect(
      service.rejectJoinRequest('meeting-1', 'user-1', 'cohost-1'),
    ).resolves.toMatchObject({
      userId: 'user-1',
      status: MeetingParticipantStatus.REJECTED,
    });

    expect(meetingAuthorizationService.assertModerator).toHaveBeenCalledWith(
      'meeting-1',
      'cohost-1',
    );
    expect(prisma.meetingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'cohost-1',
        type: MeetingEventTypeValue.JOIN_REJECTED,
      }),
    });
    expect(realtimePublisher.joinRejected).toHaveBeenCalledWith(
      'meeting-1',
      'user-1',
      expect.objectContaining({ status: MeetingParticipantStatus.REJECTED }),
    );
  });

  it('allows co-host moderators to update access settings', async () => {
    prisma.meetingParticipant.findMany.mockResolvedValue([]);
    prisma.meeting.update.mockResolvedValue({
      ...liveMeeting,
      allowJoinWithoutApproval: true,
      participants: [],
      _count: { participants: 0 },
    });

    await service.updateAccess('meeting-1', 'cohost-1', true);

    expect(meetingAuthorizationService.assertModerator).toHaveBeenCalledWith(
      'meeting-1',
      'cohost-1',
    );
    expect(prisma.meeting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'meeting-1' },
        data: { allowJoinWithoutApproval: true },
      }),
    );
    expect(realtimePublisher.accessUpdated).toHaveBeenCalledWith(
      'meeting-1',
      true,
    );
  });

  it('allows co-host moderators to end live meetings', async () => {
    prisma.meetingParticipant.updateMany.mockResolvedValue({ count: 2 });
    prisma.meeting.update.mockResolvedValue({
      ...liveMeeting,
      status: MeetingStatusValue.ENDED,
      participants: [],
      _count: { participants: 0 },
    });

    await service.endMeeting('meeting-1', 'cohost-1');

    expect(meetingAuthorizationService.assertModerator).toHaveBeenCalledWith(
      'meeting-1',
      'cohost-1',
    );
    expect(prisma.meetingParticipant.updateMany).toHaveBeenCalledWith({
      where: {
        meetingId: 'meeting-1',
        status: {
          in: [
            MeetingParticipantStatus.JOINED,
            MeetingParticipantStatus.REQUESTED,
          ],
        },
      },
      data: expect.objectContaining({
        status: MeetingParticipantStatusValue.LEFT,
      }),
    });
    expect(meetingLiveKitService.deleteRoom).toHaveBeenCalledWith('room-1');
    expect(realtimePublisher.meetingEnded).toHaveBeenCalledWith(
      'meeting-1',
      'cohost-1',
    );
  });

  it('allows co-host moderators to remove regular participants', async () => {
    prisma.meetingParticipant.findUnique.mockResolvedValue(regularParticipant);
    prisma.meetingParticipant.update.mockResolvedValue({
      ...regularParticipant,
      status: MeetingParticipantStatus.REMOVED,
      role: MeetingRole.PARTICIPANT,
    });

    await expect(
      service.removeParticipant('meeting-1', 'user-1', 'cohost-1'),
    ).resolves.toMatchObject({
      userId: 'user-1',
      status: MeetingParticipantStatus.REMOVED,
    });

    expect(meetingAuthorizationService.assertModerator).toHaveBeenCalledWith(
      'meeting-1',
      'cohost-1',
    );
    expect(meetingLiveKitService.removeParticipant).toHaveBeenCalledWith(
      'room-1',
      'user-1',
    );
    expect(realtimePublisher.participantRemoved).toHaveBeenCalledWith(
      'meeting-1',
      'user-1',
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('blocks removing self, primary host, host role, and co-host role targets', async () => {
    await expect(
      service.removeParticipant('meeting-1', 'cohost-1', 'cohost-1'),
    ).rejects.toThrow(
      new BadRequestException(MeetingErrorMessage.REMOVE_SELF_NOT_ALLOWED),
    );

    await expect(
      service.removeParticipant('meeting-1', 'host-1', 'cohost-1'),
    ).rejects.toThrow(
      new BadRequestException(MeetingErrorMessage.REMOVE_HOST_NOT_ALLOWED),
    );

    prisma.meetingParticipant.findUnique.mockResolvedValueOnce({
      ...regularParticipant,
      userId: 'host-role-1',
      role: MeetingRole.HOST,
    });
    await expect(
      service.removeParticipant('meeting-1', 'host-role-1', 'cohost-1'),
    ).rejects.toThrow(
      new BadRequestException(
        MeetingErrorMessage.REMOVE_MODERATOR_NOT_ALLOWED,
      ),
    );

    prisma.meetingParticipant.findUnique.mockResolvedValueOnce({
      ...regularParticipant,
      userId: 'cohost-2',
      role: MeetingRole.COHOST,
    });
    await expect(
      service.removeParticipant('meeting-1', 'cohost-2', 'cohost-1'),
    ).rejects.toThrow(MeetingErrorMessage.REMOVE_MODERATOR_NOT_ALLOWED);
  });

  it('keeps host/co-host role updates restricted to primary host flow', async () => {
    meetingAuthorizationService.assertHost.mockRejectedValue(
      new ForbiddenException(MeetingErrorMessage.HOST_REQUIRED),
    );

    await expect(
      service.updateParticipantRole(
        'meeting-1',
        'user-1',
        'cohost-1',
        MeetingParticipantRoleValue.COHOST,
      ),
    ).rejects.toThrow(MeetingErrorMessage.HOST_REQUIRED);
    expect(prisma.meetingParticipant.update).not.toHaveBeenCalled();
    expect(realtimePublisher.participantRoleUpdated).not.toHaveBeenCalled();
  });
});
