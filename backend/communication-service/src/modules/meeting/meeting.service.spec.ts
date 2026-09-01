import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import {
  MeetingEventType,
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  MeetingType,
} from '@prisma/client';
import { LiveKitService } from '../../infrastructure/livekit/livekit.service';
import { PrismaService } from '../../prisma/prisma.service';
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
  const createdAt = new Date('2026-09-01T00:00:00.000Z');

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
      $transaction: jest.fn(
        (handler: (transaction: MeetingTransactionMock) => Promise<CreatedMeetingMock>) =>
          handler(tx),
      ),
    } as PrismaService;
    const liveKitService = {
      isConfigured: jest.fn().mockReturnValue(true),
      createRoom: jest.fn(),
      createParticipantToken: jest.fn().mockResolvedValue('livekit-token'),
      getServerUrl: jest.fn().mockReturnValue('wss://livekit.test'),
    } as jest.Mocked<LiveKitService>;
    const service = new MeetingService(prisma, liveKitService);

    return { service, prisma, liveKitService, tx };
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
});
