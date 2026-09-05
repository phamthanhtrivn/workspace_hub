import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MeetingEventType,
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  MeetingType,
} from '@prisma/client';
import { LiveKitService } from '../../infrastructure/livekit/livekit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MeetingSocketHandler } from '../socket/meeting/meeting-socket.handler';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { MeetingService } from './meeting.service';
import { MEETING_ERROR_MESSAGES } from './types/meeting.enums';

interface CreatedMeetingMock {
  id: string;
  roomName: string;
  joinToken: string;
  type: MeetingType;
  status: MeetingStatus;
  autoAdmit: boolean;
  startedAt: Date;
  createdAt: Date;
}

interface MeetingParticipantMock {
  id: string;
  meetingId: string;
  userId: string;
  role: MeetingRole;
  status: MeetingParticipantStatus;
  joinedAt: Date | null;
  leftAt?: Date | null;
  updatedAt?: Date;
}

type MeetingTransactionMock = {
  meeting: {
    create: jest.Mock<Promise<CreatedMeetingMock>>;
  };
  meetingParticipant: {
    create: jest.Mock<Promise<void>>;
  };
  meetingEvent: {
    createMany: jest.Mock<Promise<void>>;
  };
};

describe('MeetingService', () => {
  const userId = '3d3538b6-3a0d-44a4-9979-fec1ff2b5c11';
  const guestUserId = '10f62ad8-624d-4fc0-98f1-45e9c7f2db37';
  const createdAt = new Date('2026-09-01T00:00:00.000Z');
  const meetingRecord = {
    id: 'd4b80433-ad39-4e45-b79b-1e94fe8d0b95',
    roomName: 'meeting_room',
    joinToken: 'join-token',
    type: MeetingType.INSTANT,
    status: MeetingStatus.LIVE,
    autoAdmit: true,
    startedAt: createdAt,
    createdAt,
    hostId: userId,
  };

  function createService() {
    const tx: MeetingTransactionMock = {
      meeting: {
        create: jest.fn().mockResolvedValue({
          id: 'd4b80433-ad39-4e45-b79b-1e94fe8d0b95',
          roomName: 'meeting_room',
          joinToken: 'join-token',
          type: MeetingType.INSTANT,
          status: MeetingStatus.LIVE,
          autoAdmit: true,
          startedAt: createdAt,
          createdAt,
        }),
      },
      meetingParticipant: {
        create: jest.fn(),
      },
      meetingEvent: {
        createMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((input: unknown) => {
        if (Array.isArray(input)) {
          return Promise.all(input);
        }

        return (
          input as (
            transaction: MeetingTransactionMock,
          ) => Promise<CreatedMeetingMock>
        )(tx);
      }),
      meeting: {
        findUnique: jest.fn().mockResolvedValue({
          ...meetingRecord,
          participants: [],
        }),
        update: jest.fn(),
      },
      meetingParticipant: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      meetingEvent: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
      userProfileSnapshot: {
        findMany: jest.fn(),
      },
    } as PrismaService;
    const liveKitService = {
      isConfigured: jest.fn().mockReturnValue(true),
      createRoom: jest.fn(),
      deleteRoom: jest.fn(),
      removeParticipant: jest.fn(),
      updateParticipantMetadata: jest.fn(),
      createParticipantToken: jest.fn().mockResolvedValue('livekit-token'),
      getServerUrl: jest.fn().mockReturnValue('wss://livekit.test'),
    } as jest.Mocked<LiveKitService>;
    const userProfileSnapshotService = {
      getProfilesByUserIds: jest.fn(async () => new Map()),
      attachProfilesToMembers: jest.fn(async (members) =>
        members.map((member) => ({ ...member, profile: null })),
      ),
    } as unknown as jest.Mocked<UserProfileSnapshotService>;
    const meetingSocketHandler = {
      emitToMeeting: jest.fn(),
      emitToUser: jest.fn(),
    } as unknown as jest.Mocked<MeetingSocketHandler>;
    const service = new MeetingService(
      prisma,
      liveKitService,
      userProfileSnapshotService,
      meetingSocketHandler,
    );

    return {
      service,
      prisma,
      liveKitService,
      tx,
      userProfileSnapshotService,
      meetingSocketHandler,
    };
  }

  it('creates an instant meeting with host participant, events, and LiveKit token', async () => {
    const { service, prisma, liveKitService, tx } = createService();
    const deviceSettings = {
      cameraEnabled: true,
      microphoneEnabled: false,
      cameraDeviceId: 'camera-1',
      microphoneDeviceId: 'mic-1',
    };

    const result = await service.createInstantMeeting({
      userId,
      userName: 'Thanh Tri',
      avatarUrl: 'https://cdn.test/avatar.png',
      dto: {
        autoAdmit: true,
        deviceSettings,
      },
    });

    expect(liveKitService.createRoom).toHaveBeenCalledWith(
      expect.stringMatching(/^meeting_/),
      expect.objectContaining({
        meetingType: MeetingType.INSTANT,
        createdBy: userId,
        autoAdmit: true,
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.meeting.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: MeetingType.INSTANT,
        status: MeetingStatus.LIVE,
        createdBy: userId,
        hostId: userId,
        autoAdmit: true,
        startedAt: expect.objectContaining({}) as Date,
      }),
    });
    expect(tx.meetingParticipant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        role: MeetingRole.HOST,
        status: MeetingParticipantStatus.JOINED,
        joinedAt: expect.objectContaining({}) as Date,
        lastSeenAt: expect.objectContaining({}) as Date,
      }),
    });
    expect(tx.meetingEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ type: MeetingEventType.CREATED }),
        expect.objectContaining({ type: MeetingEventType.STARTED }),
      ]),
    });
    expect(liveKitService.createParticipantToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        displayName: 'Thanh Tri',
        avatarUrl: 'https://cdn.test/avatar.png',
        role: MeetingRole.HOST,
        deviceSettings,
      }),
    );
    expect(result).toEqual({
      meeting: {
        id: 'd4b80433-ad39-4e45-b79b-1e94fe8d0b95',
        roomName: 'meeting_room',
        joinToken: 'join-token',
        type: MeetingType.INSTANT,
        status: MeetingStatus.LIVE,
        autoAdmit: true,
        startedAt: createdAt.toISOString(),
        createdAt: createdAt.toISOString(),
        participantRole: MeetingRole.HOST,
      },
      livekit: {
        serverUrl: 'wss://livekit.test',
        token: 'livekit-token',
      },
    });
  });

  it('defaults autoAdmit to true', async () => {
    const { service, tx } = createService();

    await service.createInstantMeeting({
      userId,
      dto: {},
    });

    expect(tx.meeting.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        autoAdmit: true,
      }),
    });
  });

  it('checks meeting access without creating a participant or LiveKit token', async () => {
    const { service, prisma, liveKitService } = createService();

    const result = await service.getMeetingAccess({
      joinToken: 'join-token',
      userId: guestUserId,
    });

    expect(prisma.meeting.findUnique).toHaveBeenCalledWith({
      where: { joinToken: 'join-token' },
      include: {
        participants: {
          where: { userId: guestUserId },
          take: 1,
        },
      },
    });
    expect(prisma.meetingParticipant.upsert).not.toHaveBeenCalled();
    expect(prisma.meetingEvent.create).not.toHaveBeenCalled();
    expect(liveKitService.createParticipantToken).not.toHaveBeenCalled();
    expect(result).toEqual({
      meetingId: meetingRecord.id,
      joinToken: 'join-token',
      status: MeetingStatus.LIVE,
      autoAdmit: true,
      canJoinWithoutApproval: true,
      participantRole: MeetingRole.PARTICIPANT,
      participantStatus: null,
    });
  });

  it('returns host role when the host checks meeting access by token', async () => {
    const { service } = createService();

    const result = await service.getMeetingAccess({
      joinToken: 'join-token',
      userId,
    });

    expect(result.participantRole).toBe(MeetingRole.HOST);
  });

  it('throws when userId is missing while checking meeting access', async () => {
    const { service } = createService();

    await expect(
      service.getMeetingAccess({
        joinToken: 'join-token',
        userId: '',
      }),
    ).rejects.toThrow(
      new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID),
    );
  });

  it('throws when the meeting access join token is not found', async () => {
    const { service, prisma } = createService();
    prisma.meeting.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.getMeetingAccess({
        joinToken: 'missing-token',
        userId,
      }),
    ).rejects.toThrow(
      new NotFoundException(MEETING_ERROR_MESSAGES.MEETING_NOT_FOUND),
    );
  });

  it('throws when checking access for a meeting that is not live', async () => {
    const { service, prisma } = createService();
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      status: MeetingStatus.ENDED,
      participants: [],
    });

    await expect(
      service.getMeetingAccess({
        joinToken: 'join-token',
        userId,
      }),
    ).rejects.toThrow(
      new BadRequestException(MEETING_ERROR_MESSAGES.MEETING_NOT_LIVE),
    );
  });

  it('throws when userId is missing', async () => {
    const { service } = createService();

    await expect(
      service.createInstantMeeting({
        userId: '',
        dto: {},
      }),
    ).rejects.toThrow(
      new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID),
    );
  });

  it('throws when LiveKit is not configured', async () => {
    const { service, liveKitService } = createService();
    liveKitService.isConfigured.mockReturnValue(false);

    await expect(
      service.createInstantMeeting({
        userId,
        dto: {},
      }),
    ).rejects.toThrow(
      new ServiceUnavailableException(
        MEETING_ERROR_MESSAGES.LIVEKIT_NOT_CONFIGURED,
      ),
    );
  });

  it('joins a live meeting and creates a LiveKit participant token', async () => {
    const { service, prisma, liveKitService } = createService();
    const deviceSettings = {
      cameraEnabled: false,
      microphoneEnabled: true,
      cameraDeviceId: 'camera-1',
      microphoneDeviceId: 'mic-1',
    };

    const result = await service.joinMeeting({
      joinToken: 'join-token',
      userId: guestUserId,
      userName: 'Guest User',
      avatarUrl: 'https://cdn.test/guest.png',
      dto: { deviceSettings },
    });

    expect(prisma.meeting.findUnique).toHaveBeenCalledWith({
      where: { joinToken: 'join-token' },
      include: {
        participants: {
          where: { userId: guestUserId },
          take: 1,
        },
      },
    });
    expect(prisma.meetingParticipant.upsert).toHaveBeenCalledWith({
      where: {
        meetingId_userId: {
          meetingId: meetingRecord.id,
          userId: guestUserId,
        },
      },
      create: expect.objectContaining({
        meetingId: meetingRecord.id,
        userId: guestUserId,
        role: MeetingRole.PARTICIPANT,
        status: MeetingParticipantStatus.JOINED,
      }),
      update: expect.objectContaining({
        status: MeetingParticipantStatus.JOINED,
        leftAt: null,
      }),
    });
    expect(prisma.meetingEvent.create).toHaveBeenCalledWith({
      data: {
        meetingId: meetingRecord.id,
        actorId: guestUserId,
        type: MeetingEventType.PARTICIPANT_JOINED,
      },
    });
    expect(liveKitService.createParticipantToken).toHaveBeenCalledWith(
      expect.objectContaining({
        roomName: meetingRecord.roomName,
        userId: guestUserId,
        displayName: 'Guest User',
        avatarUrl: 'https://cdn.test/guest.png',
        role: MeetingRole.PARTICIPANT,
        deviceSettings,
      }),
    );
    expect(result.meeting.participantRole).toBe(MeetingRole.PARTICIPANT);
    expect(result.livekit.token).toBe('livekit-token');
  });

  it('keeps the host role when the host joins by token', async () => {
    const { service } = createService();

    const result = await service.joinMeeting({
      joinToken: 'join-token',
      userId,
      dto: {},
    });

    expect(result.meeting.participantRole).toBe(MeetingRole.HOST);
  });

  it('keeps an existing participant role when joining again', async () => {
    const { service, prisma } = createService();
    const existingParticipant: MeetingParticipantMock = {
      id: 'participant-id',
      meetingId: meetingRecord.id,
      userId: guestUserId,
      role: MeetingRole.COHOST,
      status: MeetingParticipantStatus.LEFT,
      joinedAt: createdAt,
    };
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      participants: [existingParticipant],
    });

    const result = await service.joinMeeting({
      joinToken: 'join-token',
      userId: guestUserId,
      dto: {},
    });

    expect(prisma.meetingParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: MeetingRole.COHOST }),
        update: expect.objectContaining({ joinedAt: createdAt }),
      }),
    );
    expect(prisma.meetingEvent.create).not.toHaveBeenCalled();
    expect(result.meeting.participantRole).toBe(MeetingRole.COHOST);
  });

  it('throws when the meeting join token is not found', async () => {
    const { service, prisma } = createService();
    prisma.meeting.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.joinMeeting({
        joinToken: 'missing-token',
        userId,
        dto: {},
      }),
    ).rejects.toThrow(
      new NotFoundException(MEETING_ERROR_MESSAGES.MEETING_NOT_FOUND),
    );
  });

  it('throws when the meeting is not live', async () => {
    const { service, prisma } = createService();
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      status: MeetingStatus.ENDED,
      participants: [],
    });

    await expect(
      service.joinMeeting({
        joinToken: 'join-token',
        userId,
        dto: {},
      }),
    ).rejects.toThrow(
      new BadRequestException(MEETING_ERROR_MESSAGES.MEETING_NOT_LIVE),
    );
  });

  it('throws when a locked meeting requires approval', async () => {
    const { service, prisma } = createService();
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      autoAdmit: false,
      participants: [],
    });

    await expect(
      service.joinMeeting({
        joinToken: 'join-token',
        userId: guestUserId,
        dto: {},
      }),
    ).rejects.toThrow(
      new ForbiddenException(
        MEETING_ERROR_MESSAGES.MEETING_JOIN_REQUIRES_APPROVAL,
      ),
    );
  });

  it('creates a pending join request for a locked meeting', async () => {
    const { service, prisma, meetingSocketHandler } = createService();
    const requestedAt = new Date('2026-09-01T01:00:00.000Z');
    const request = {
      id: 'request-id',
      meetingId: meetingRecord.id,
      userId: guestUserId,
      role: MeetingRole.PARTICIPANT,
      status: MeetingParticipantStatus.REQUESTED,
      joinedAt: null,
      updatedAt: requestedAt,
    };
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      autoAdmit: false,
      participants: [],
    });
    prisma.meetingParticipant.upsert = jest.fn().mockResolvedValue(request);

    const result = await service.requestJoinApproval({
      joinToken: 'join-token',
      userId: guestUserId,
      dto: {},
    });

    expect(prisma.meetingParticipant.upsert).toHaveBeenCalledWith({
      where: {
        meetingId_userId: {
          meetingId: meetingRecord.id,
          userId: guestUserId,
        },
      },
      create: expect.objectContaining({
        meetingId: meetingRecord.id,
        userId: guestUserId,
        role: MeetingRole.PARTICIPANT,
        status: MeetingParticipantStatus.REQUESTED,
      }),
      update: expect.objectContaining({
        status: MeetingParticipantStatus.REQUESTED,
        leftAt: null,
      }),
    });
    expect(prisma.meetingEvent.create).toHaveBeenCalledWith({
      data: {
        meetingId: meetingRecord.id,
        actorId: guestUserId,
        type: MeetingEventType.JOIN_REQUESTED,
      },
    });
    expect(meetingSocketHandler.emitToMeeting).toHaveBeenCalled();
    expect(meetingSocketHandler.emitToUser).toHaveBeenCalled();
    expect(result).toEqual({
      meetingId: meetingRecord.id,
      joinToken: 'join-token',
      participantStatus: MeetingParticipantStatus.REQUESTED,
    });
  });

  it('allows a host to approve a pending join request', async () => {
    const { service, prisma, meetingSocketHandler } = createService();
    const requestedAt = new Date('2026-09-01T01:00:00.000Z');
    const pendingRequest = {
      id: 'request-id',
      meetingId: meetingRecord.id,
      userId: guestUserId,
      role: MeetingRole.PARTICIPANT,
      status: MeetingParticipantStatus.REQUESTED,
      joinedAt: null,
      updatedAt: requestedAt,
    };
    const approvedRequest = {
      ...pendingRequest,
      status: MeetingParticipantStatus.APPROVED,
    };
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      participants: [
        {
          id: 'host-participant-id',
          meetingId: meetingRecord.id,
          userId,
          role: MeetingRole.HOST,
          status: MeetingParticipantStatus.JOINED,
          joinedAt: createdAt,
        },
      ],
    });
    prisma.meetingParticipant.findUnique = jest
      .fn()
      .mockResolvedValue(pendingRequest);
    prisma.meetingParticipant.update = jest.fn().mockResolvedValue(approvedRequest);

    const result = await service.approveJoinRequest({
      joinToken: 'join-token',
      userId,
      targetUserId: guestUserId,
    });

    expect(prisma.meetingParticipant.update).toHaveBeenCalledWith({
      where: { id: pendingRequest.id },
      data: { status: MeetingParticipantStatus.APPROVED },
    });
    expect(prisma.meetingEvent.create).toHaveBeenCalledWith({
      data: {
        meetingId: meetingRecord.id,
        actorId: userId,
        type: MeetingEventType.JOIN_REQUEST_APPROVED,
        metadata: { targetUserId: guestUserId },
      },
    });
    expect(meetingSocketHandler.emitToMeeting).toHaveBeenCalled();
    expect(meetingSocketHandler.emitToUser).toHaveBeenCalled();
    expect(result.status).toBe(MeetingParticipantStatus.APPROVED);
  });

  it('lists joined meeting participants with profile search and pagination', async () => {
    const { service, prisma, userProfileSnapshotService } = createService();
    const joinedAt = new Date('2026-09-01T01:00:00.000Z');
    const participant = {
      id: 'participant-id',
      meetingId: meetingRecord.id,
      userId: guestUserId,
      role: MeetingRole.PARTICIPANT,
      status: MeetingParticipantStatus.JOINED,
      joinedAt,
      leftAt: null,
      updatedAt: joinedAt,
    };
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      participants: [
        {
          id: 'host-participant-id',
          meetingId: meetingRecord.id,
          userId,
          role: MeetingRole.HOST,
          status: MeetingParticipantStatus.JOINED,
          joinedAt: createdAt,
        },
      ],
    });
    prisma.userProfileSnapshot.findMany = jest
      .fn()
      .mockResolvedValue([{ userId: guestUserId }]);
    prisma.meetingParticipant.count = jest.fn().mockResolvedValue(1);
    prisma.meetingParticipant.findMany = jest.fn().mockResolvedValue([participant]);
    userProfileSnapshotService.attachProfilesToMembers.mockResolvedValue([
      {
        ...participant,
        profile: {
          id: guestUserId,
          userId: guestUserId,
          email: 'guest@test.dev',
          fullName: 'Guest User',
          avatarUrl: null,
        },
      },
    ]);

    const result = await service.listMeetingParticipants({
      joinToken: 'join-token',
      userId,
      query: { search: 'guest', page: 2, limit: 8 },
    });

    expect(prisma.userProfileSnapshot.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { fullName: { contains: 'guest', mode: 'insensitive' } },
          { email: { contains: 'guest', mode: 'insensitive' } },
        ],
      },
      select: { userId: true },
    });
    expect(prisma.meetingParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 8,
        take: 8,
      }),
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'participant-id',
          userId: guestUserId,
          role: MeetingRole.PARTICIPANT,
          joinedAt: joinedAt.toISOString(),
        }),
      ],
      page: 2,
      limit: 8,
      total: 1,
      totalPages: 1,
    });
  });

  it('saves a participant leave action and emits participant updates', async () => {
    const { service, prisma, meetingSocketHandler } = createService();
    const joinedAt = new Date('2026-09-01T01:00:00.000Z');
    const participant = {
      id: 'participant-id',
      meetingId: meetingRecord.id,
      userId: guestUserId,
      role: MeetingRole.PARTICIPANT,
      status: MeetingParticipantStatus.JOINED,
      joinedAt,
      updatedAt: joinedAt,
    };
    const leftParticipant = {
      ...participant,
      status: MeetingParticipantStatus.LEFT,
      leftAt: new Date('2026-09-01T01:30:00.000Z'),
    };
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      participants: [participant],
    });
    prisma.meetingParticipant.update = jest
      .fn()
      .mockResolvedValue(leftParticipant);

    const result = await service.leaveMeeting({
      joinToken: 'join-token',
      userId: guestUserId,
    });

    expect(prisma.meetingParticipant.update).toHaveBeenCalledWith({
      where: { id: 'participant-id' },
      data: expect.objectContaining({
        status: MeetingParticipantStatus.LEFT,
        leftAt: expect.objectContaining({}) as Date,
      }),
    });
    expect(prisma.meetingEvent.create).toHaveBeenCalledWith({
      data: {
        meetingId: meetingRecord.id,
        actorId: guestUserId,
        type: MeetingEventType.PARTICIPANT_LEFT,
      },
    });
    expect(meetingSocketHandler.emitToMeeting).toHaveBeenCalled();
    expect(result.status).toBe(MeetingParticipantStatus.LEFT);
  });

  it('allows the host to end the meeting for everyone', async () => {
    const { service, prisma, liveKitService, meetingSocketHandler } =
      createService();
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      participants: [
        {
          id: 'host-participant-id',
          meetingId: meetingRecord.id,
          userId,
          role: MeetingRole.HOST,
          status: MeetingParticipantStatus.JOINED,
          joinedAt: createdAt,
        },
      ],
    });
    prisma.meeting.update = jest.fn().mockResolvedValue({
      ...meetingRecord,
      status: MeetingStatus.ENDED,
    });
    prisma.meetingParticipant.updateMany = jest
      .fn()
      .mockResolvedValue({ count: 2 });
    prisma.meetingEvent.create = jest.fn().mockResolvedValue({});

    const result = await service.endMeeting({
      joinToken: 'join-token',
      userId,
    });

    expect(prisma.meeting.update).toHaveBeenCalledWith({
      where: { id: meetingRecord.id },
      data: expect.objectContaining({
        status: MeetingStatus.ENDED,
        endedAt: expect.objectContaining({}) as Date,
      }),
    });
    expect(prisma.meetingParticipant.updateMany).toHaveBeenCalledWith({
      where: {
        meetingId: meetingRecord.id,
        status: MeetingParticipantStatus.JOINED,
      },
      data: expect.objectContaining({
        status: MeetingParticipantStatus.LEFT,
      }),
    });
    expect(liveKitService.deleteRoom).toHaveBeenCalledWith(
      meetingRecord.roomName,
    );
    expect(meetingSocketHandler.emitToMeeting).toHaveBeenCalled();
    expect(result.status).toBe(MeetingStatus.ENDED);
  });

  it('prevents non-hosts from ending the meeting', async () => {
    const { service, prisma } = createService();
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      participants: [
        {
          id: 'guest-participant-id',
          meetingId: meetingRecord.id,
          userId: guestUserId,
          role: MeetingRole.COHOST,
          status: MeetingParticipantStatus.JOINED,
          joinedAt: createdAt,
        },
      ],
    });

    await expect(
      service.endMeeting({
        joinToken: 'join-token',
        userId: guestUserId,
      }),
    ).rejects.toThrow(
      new ForbiddenException(MEETING_ERROR_MESSAGES.MEETING_HOST_REQUIRED),
    );
  });

  it('allows a co-host to remove a regular participant', async () => {
    const { service, prisma, liveKitService, meetingSocketHandler } =
      createService();
    const cohostId = '9d3538b6-3a0d-44a4-9979-fec1ff2b5c22';
    const joinedAt = new Date('2026-09-01T01:00:00.000Z');
    const targetParticipant = {
      id: 'target-participant-id',
      meetingId: meetingRecord.id,
      userId: guestUserId,
      role: MeetingRole.PARTICIPANT,
      status: MeetingParticipantStatus.JOINED,
      joinedAt,
      updatedAt: joinedAt,
    };
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      participants: [
        {
          id: 'cohost-participant-id',
          meetingId: meetingRecord.id,
          userId: cohostId,
          role: MeetingRole.COHOST,
          status: MeetingParticipantStatus.JOINED,
          joinedAt,
        },
      ],
    });
    prisma.meetingParticipant.findUnique = jest
      .fn()
      .mockResolvedValue(targetParticipant);
    prisma.meetingParticipant.update = jest.fn().mockResolvedValue({
      ...targetParticipant,
      status: MeetingParticipantStatus.REMOVED,
      leftAt: new Date('2026-09-01T01:30:00.000Z'),
    });

    const result = await service.removeParticipant({
      joinToken: 'join-token',
      userId: cohostId,
      targetUserId: guestUserId,
    });

    expect(prisma.meetingParticipant.update).toHaveBeenCalledWith({
      where: { id: 'target-participant-id' },
      data: expect.objectContaining({
        status: MeetingParticipantStatus.REMOVED,
      }),
    });
    expect(liveKitService.removeParticipant).toHaveBeenCalledWith(
      meetingRecord.roomName,
      guestUserId,
    );
    expect(meetingSocketHandler.emitToMeeting).toHaveBeenCalled();
    expect(result.status).toBe(MeetingParticipantStatus.REMOVED);
  });

  it('prevents co-hosts from removing another co-host', async () => {
    const { service, prisma } = createService();
    const cohostId = '9d3538b6-3a0d-44a4-9979-fec1ff2b5c22';
    const joinedAt = new Date('2026-09-01T01:00:00.000Z');
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      participants: [
        {
          id: 'cohost-participant-id',
          meetingId: meetingRecord.id,
          userId: cohostId,
          role: MeetingRole.COHOST,
          status: MeetingParticipantStatus.JOINED,
          joinedAt,
        },
      ],
    });
    prisma.meetingParticipant.findUnique = jest.fn().mockResolvedValue({
      id: 'target-participant-id',
      meetingId: meetingRecord.id,
      userId: guestUserId,
      role: MeetingRole.COHOST,
      status: MeetingParticipantStatus.JOINED,
      joinedAt,
      updatedAt: joinedAt,
    });

    await expect(
      service.removeParticipant({
        joinToken: 'join-token',
        userId: cohostId,
        targetUserId: guestUserId,
      }),
    ).rejects.toThrow(
      new ForbiddenException(MEETING_ERROR_MESSAGES.CANNOT_REMOVE_MODERATOR),
    );
  });

  it('allows the host to promote, demote, and transfer host ownership', async () => {
    const { service, prisma, liveKitService, meetingSocketHandler } =
      createService();
    const joinedAt = new Date('2026-09-01T01:00:00.000Z');
    const targetParticipant = {
      id: 'target-participant-id',
      meetingId: meetingRecord.id,
      userId: guestUserId,
      role: MeetingRole.PARTICIPANT,
      status: MeetingParticipantStatus.JOINED,
      joinedAt,
      updatedAt: joinedAt,
    };
    const promotedParticipant = {
      ...targetParticipant,
      role: MeetingRole.COHOST,
    };
    prisma.meeting.findUnique = jest.fn().mockResolvedValue({
      ...meetingRecord,
      participants: [
        {
          id: 'host-participant-id',
          meetingId: meetingRecord.id,
          userId,
          role: MeetingRole.HOST,
          status: MeetingParticipantStatus.JOINED,
          joinedAt: createdAt,
        },
      ],
    });
    prisma.meetingParticipant.findUnique = jest
      .fn()
      .mockResolvedValue(targetParticipant);
    prisma.meetingParticipant.update = jest
      .fn()
      .mockResolvedValueOnce(promotedParticipant)
      .mockResolvedValueOnce({
        ...promotedParticipant,
        role: MeetingRole.PARTICIPANT,
      })
      .mockResolvedValueOnce({ ...targetParticipant, role: MeetingRole.HOST })
      .mockResolvedValueOnce({
        id: 'host-participant-id',
        meetingId: meetingRecord.id,
        userId,
        role: MeetingRole.PARTICIPANT,
        status: MeetingParticipantStatus.JOINED,
        joinedAt: createdAt,
        updatedAt: createdAt,
      });
    prisma.meeting.update = jest.fn().mockResolvedValue({
      ...meetingRecord,
      hostId: guestUserId,
    });
    prisma.meetingEvent.create = jest.fn().mockResolvedValue({});

    await service.updateParticipantRole({
      joinToken: 'join-token',
      userId,
      targetUserId: guestUserId,
      dto: { role: MeetingRole.COHOST },
    });
    await service.updateParticipantRole({
      joinToken: 'join-token',
      userId,
      targetUserId: guestUserId,
      dto: { role: MeetingRole.PARTICIPANT },
    });
    const transferResult = await service.updateParticipantRole({
      joinToken: 'join-token',
      userId,
      targetUserId: guestUserId,
      dto: { role: MeetingRole.HOST },
    });

    expect(prisma.meetingParticipant.update).toHaveBeenCalledWith({
      where: { id: 'target-participant-id' },
      data: { role: MeetingRole.COHOST },
    });
    expect(prisma.meetingParticipant.update).toHaveBeenCalledWith({
      where: { id: 'target-participant-id' },
      data: { role: MeetingRole.PARTICIPANT },
    });
    expect(prisma.meeting.update).toHaveBeenCalledWith({
      where: { id: meetingRecord.id },
      data: { hostId: guestUserId },
    });
    expect(liveKitService.updateParticipantMetadata).toHaveBeenCalled();
    expect(meetingSocketHandler.emitToMeeting).toHaveBeenCalled();
    expect(transferResult.role).toBe(MeetingRole.HOST);
  });
});
