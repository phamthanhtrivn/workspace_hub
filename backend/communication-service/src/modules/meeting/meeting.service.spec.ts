import { ForbiddenException } from '@nestjs/common';
import {
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  MeetingType,
} from '@prisma/client';
import { MeetingService } from './meeting.service';
import { MeetingErrorMessage } from './types/meeting.enums';

jest.mock('../chat/chat.gateway', () => ({
  ChatGateway: class ChatGateway {},
}));

jest.mock('../user-profile-snapshot/user-profile-snapshot.service', () => ({
  UserProfileSnapshotService: class UserProfileSnapshotService {},
}));

describe('MeetingService', () => {
  const meetingId = '11111111-1111-1111-1111-111111111111';
  const hostId = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';
  const now = new Date('2026-01-01T00:00:00.000Z');

  let prisma: any;
  let chatGateway: any;
  let userProfileSnapshotService: any;
  let liveKitRoomServiceClient: any;
  let service: MeetingService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);

    prisma = {
      meeting: {
        findUnique: jest.fn(),
      },
      meetingParticipant: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: any) => unknown) =>
        callback(prisma),
      ),
      meetingEvent: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
    };
    prisma.meetingParticipant.update = jest.fn();
    prisma.meetingParticipant.updateMany = jest.fn();
    prisma.meetingParticipant.findMany = jest.fn();

    chatGateway = {
      emitMeetingJoinApproved: jest.fn(),
      emitMeetingParticipantLeft: jest.fn(),
    };
    userProfileSnapshotService = {
      attachProfilesToMembers: jest.fn(async (participants: unknown[]) =>
        participants.map((participant) => ({ ...participant, profile: null })),
      ),
    };
    liveKitRoomServiceClient = {
      removeParticipant: jest.fn(),
      deleteRoom: jest.fn(),
    };

    service = new MeetingService(
      prisma,
      chatGateway,
      userProfileSnapshotService,
      { apiKey: 'key', apiSecret: 'secret', publicUrl: 'wss://livekit.test' },
      liveKitRoomServiceClient,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('leaveMeeting', () => {
    it('marks a joined participant as left and emits the participant-left event', async () => {
      const participant = buildParticipant({
        status: MeetingParticipantStatus.JOINED,
      });
      const leftParticipant = buildParticipant({
        status: MeetingParticipantStatus.LEFT,
        leftAt: now,
        lastSeenAt: now,
      });
      prisma.meeting.findUnique.mockResolvedValue(buildMeeting());
      prisma.meetingParticipant.findUnique.mockResolvedValue(participant);
      prisma.meetingParticipant.update.mockResolvedValue(leftParticipant);

      await expect(service.leaveMeeting(meetingId, userId)).resolves.toEqual({
        ...leftParticipant,
        profile: null,
      });

      expect(prisma.meetingParticipant.update).toHaveBeenCalledWith({
        where: {
          meetingId_userId: {
            meetingId,
            userId,
          },
        },
        data: {
          status: MeetingParticipantStatus.LEFT,
          leftAt: now,
          lastSeenAt: now,
        },
      });
      expect(prisma.meetingEvent.create).toHaveBeenCalledWith({
        data: {
          meetingId,
          actorId: userId,
          type: 'PARTICIPANT_LEFT',
        },
      });
      expect(liveKitRoomServiceClient.removeParticipant).toHaveBeenCalledWith(
        'meeting-room',
        userId,
      );
      expect(chatGateway.emitMeetingParticipantLeft).toHaveBeenCalledWith(
        meetingId,
        userId,
        { ...leftParticipant, profile: null },
      );
    });

    it('keeps a removed participant removed and rejects the leave request', async () => {
      prisma.meeting.findUnique.mockResolvedValue(buildMeeting());
      prisma.meetingParticipant.findUnique.mockResolvedValue(
        buildParticipant({ status: MeetingParticipantStatus.REMOVED }),
      );

      await expect(service.leaveMeeting(meetingId, userId)).rejects.toThrow(
        MeetingErrorMessage.PARTICIPANT_REMOVED,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.meetingParticipant.update).not.toHaveBeenCalled();
      expect(chatGateway.emitMeetingParticipantLeft).not.toHaveBeenCalled();
    });

    it('rejects requested participants that have not joined yet', async () => {
      prisma.meeting.findUnique.mockResolvedValue(buildMeeting());
      prisma.meetingParticipant.findUnique.mockResolvedValue(
        buildParticipant({ status: MeetingParticipantStatus.REQUESTED }),
      );

      await expect(service.leaveMeeting(meetingId, userId)).rejects.toThrow(
        MeetingErrorMessage.PARTICIPANT_JOIN_REQUIRED,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.meetingParticipant.update).not.toHaveBeenCalled();
    });

    it('rejects missing participants', async () => {
      prisma.meeting.findUnique.mockResolvedValue(buildMeeting());
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      await expect(service.leaveMeeting(meetingId, userId)).rejects.toThrow(
        MeetingErrorMessage.PARTICIPANT_JOIN_REQUIRED,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.meetingParticipant.update).not.toHaveBeenCalled();
    });
  });

  describe('approveAllJoinRequests', () => {
    it('approves only pending non-host requests and emits approval for each participant', async () => {
      const requesterA = buildParticipant({
        userId: '44444444-4444-4444-4444-444444444444',
        status: MeetingParticipantStatus.REQUESTED,
      });
      const requesterB = buildParticipant({
        userId: '55555555-5555-5555-5555-555555555555',
        status: MeetingParticipantStatus.REQUESTED,
      });
      const approvedParticipants = [
        { ...requesterA, status: MeetingParticipantStatus.JOINED },
        { ...requesterB, status: MeetingParticipantStatus.JOINED },
      ];
      prisma.meeting.findUnique.mockResolvedValue({
        ...buildMeeting(),
        participants: [
          buildParticipant({
            userId: hostId,
            role: MeetingRole.HOST,
            status: MeetingParticipantStatus.JOINED,
          }),
        ],
      });
      prisma.meetingParticipant.findMany
        .mockResolvedValueOnce([requesterA, requesterB])
        .mockResolvedValueOnce(approvedParticipants);

      await expect(
        service.approveAllJoinRequests(meetingId, hostId),
      ).resolves.toEqual({
        approvedCount: 2,
        participants: approvedParticipants.map((participant) => ({
          ...participant,
          profile: null,
        })),
      });

      expect(prisma.meetingParticipant.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          meetingId,
          status: MeetingParticipantStatus.REQUESTED,
          userId: { not: hostId },
        },
      });
      expect(prisma.meetingParticipant.updateMany).toHaveBeenCalledWith({
        where: {
          meetingId,
          userId: { in: [requesterA.userId, requesterB.userId] },
          status: MeetingParticipantStatus.REQUESTED,
        },
        data: {
          status: MeetingParticipantStatus.JOINED,
          joinedAt: now,
          lastSeenAt: now,
          leftAt: null,
        },
      });
      expect(chatGateway.emitMeetingJoinApproved).toHaveBeenCalledTimes(2);
      expect(chatGateway.emitMeetingJoinApproved).toHaveBeenCalledWith(
        meetingId,
        requesterA.userId,
        { ...approvedParticipants[0], profile: null },
      );
      expect(chatGateway.emitMeetingJoinApproved).toHaveBeenCalledWith(
        meetingId,
        requesterB.userId,
        { ...approvedParticipants[1], profile: null },
      );
    });

    it('does not write or emit when there are no pending requests', async () => {
      prisma.meeting.findUnique.mockResolvedValue({
        ...buildMeeting(),
        participants: [
          buildParticipant({
            userId: hostId,
            role: MeetingRole.HOST,
            status: MeetingParticipantStatus.JOINED,
          }),
        ],
      });
      prisma.meetingParticipant.findMany.mockResolvedValueOnce([]);

      await expect(
        service.approveAllJoinRequests(meetingId, hostId),
      ).resolves.toEqual({
        approvedCount: 0,
        participants: [],
      });

      expect(prisma.meetingParticipant.updateMany).not.toHaveBeenCalled();
      expect(prisma.meetingEvent.createMany).not.toHaveBeenCalled();
      expect(chatGateway.emitMeetingJoinApproved).not.toHaveBeenCalled();
    });

    it('requires a meeting moderator', async () => {
      prisma.meeting.findUnique.mockResolvedValue({
        ...buildMeeting(),
        participants: [],
      });

      await expect(
        service.approveAllJoinRequests(meetingId, userId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  function buildMeeting() {
    return {
      id: meetingId,
      roomName: 'meeting-room',
      joinToken: 'join-token',
      description: null,
      type: MeetingType.INSTANT,
      status: MeetingStatus.LIVE,
      createdBy: hostId,
      hostId,
      scheduledStartAt: null,
      scheduledEndAt: null,
      startedAt: now,
      endedAt: null,
      cancelledAt: null,
      hasPassword: false,
      passwordHash: null,
      allowJoinWithoutApproval: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  function buildParticipant(
    overrides: Partial<ReturnType<typeof buildBaseParticipant>> = {},
  ) {
    return {
      ...buildBaseParticipant(),
      ...overrides,
    };
  }

  function buildBaseParticipant() {
    return {
      id: '66666666-6666-6666-6666-666666666666',
      meetingId,
      userId,
      role: MeetingRole.PARTICIPANT,
      status: MeetingParticipantStatus.JOINED,
      invitedAt: null,
      joinedAt: now,
      leftAt: null,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }
});
