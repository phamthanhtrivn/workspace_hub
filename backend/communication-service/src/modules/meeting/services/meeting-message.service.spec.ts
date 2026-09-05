import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { S3Service } from '../../../infrastructure/s3/s3.service';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { MeetingMessageService } from './meeting-message.service';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('MeetingMessageService', () => {
  const joinToken = 'join-token';
  const userId = '3d3538b6-3a0d-44a4-9979-fec1ff2b5c11';
  const meetingId = 'd4b80433-ad39-4e45-b79b-1e94fe8d0b95';
  const createdAt = new Date('2026-09-01T00:00:00.000Z');
  const joinedAt = new Date('2026-09-01T01:00:00.000Z');
  const lastReadAt = new Date('2026-09-01T01:30:00.000Z');

  function createService() {
    const countMeetingMessages = jest.fn().mockResolvedValue(2);
    const prisma = {
      meetingMessage: {
        count: countMeetingMessages,
      },
    } as unknown as PrismaService;
    const meetingPolicyService = {
      assertJoinedMeetingParticipant: jest.fn(),
    } as unknown as jest.Mocked<MeetingPolicyService>;
    const service = new MeetingMessageService(
      prisma,
      {} as S3Service,
      {} as UserProfileSnapshotService,
      meetingPolicyService,
      {} as MeetingRealtimeService,
    );

    return { countMeetingMessages, meetingPolicyService, service };
  }

  it('counts unread meeting messages after the participant joined when no read timestamp exists', async () => {
    const { countMeetingMessages, meetingPolicyService, service } =
      createService();
    meetingPolicyService.assertJoinedMeetingParticipant.mockResolvedValue({
      meeting: { id: meetingId },
      participant: {
        createdAt,
        joinedAt,
        lastReadAt: null,
      },
    } as never);

    const result = await service.getUnreadMessageCount({ joinToken, userId });

    expect(result).toEqual({ count: 2 });
    expect(countMeetingMessages).toHaveBeenCalledWith({
      where: {
        meetingId,
        deletedAt: null,
        createdAt: {
          gt: joinedAt,
        },
        senderId: {
          not: userId,
        },
      },
    });
  });

  it('counts unread meeting messages after the participant last read timestamp', async () => {
    const { countMeetingMessages, meetingPolicyService, service } =
      createService();
    meetingPolicyService.assertJoinedMeetingParticipant.mockResolvedValue({
      meeting: { id: meetingId },
      participant: {
        createdAt,
        joinedAt,
        lastReadAt,
      },
    } as never);

    await service.getUnreadMessageCount({ joinToken, userId });

    expect(countMeetingMessages).toHaveBeenCalledWith({
      where: {
        meetingId,
        deletedAt: null,
        createdAt: {
          gt: lastReadAt,
        },
        senderId: {
          not: userId,
        },
      },
    });
  });

  it('lets the joined participant policy reject invalid meeting access', async () => {
    const { countMeetingMessages, meetingPolicyService, service } =
      createService();
    const error = new ForbiddenException('not joined');
    meetingPolicyService.assertJoinedMeetingParticipant.mockRejectedValue(
      error,
    );

    await expect(
      service.getUnreadMessageCount({ joinToken, userId }),
    ).rejects.toBe(error);
    expect(countMeetingMessages).not.toHaveBeenCalled();
  });
});
