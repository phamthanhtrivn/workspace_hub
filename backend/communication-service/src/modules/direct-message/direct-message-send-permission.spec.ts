import { ForbiddenException } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { DirectMessageService } from './direct-message.service';
import { MeetingRoomService } from '../meeting/services/meeting-room.service';

jest.mock('src/infrastructure/s3/s3.service', () => ({ S3Service: class {} }));

describe('direct message creation paths', () => {
  it('rejects an HTTP or socket message before writing when permission is denied', async () => {
    const prisma = { $transaction: jest.fn() };
    const permission = {
      assertCanSend: jest.fn().mockRejectedValue(new ForbiddenException('DM blocked')),
    };
    const service = new DirectMessageService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      permission as any,
    );

    await expect(
      service.createDirectMessage('conversation-id', 'sender-id', 'hello', MessageType.TEXT),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a direct meeting card before creating a LiveKit room', async () => {
    const prisma = {
      directConversationParticipant: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'sender-id' }),
      },
      $transaction: jest.fn(),
    };
    const liveKit = {
      isConfigured: jest.fn().mockReturnValue(true),
      createRoom: jest.fn(),
    };
    const permission = {
      assertCanSend: jest.fn().mockRejectedValue(new ForbiddenException('DM blocked')),
    };
    const service = new MeetingRoomService(
      prisma as any,
      liveKit as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      permission as any,
    );

    await expect(
      service.createInstantMeeting({
        userId: 'sender-id',
        dto: { conversationId: 'conversation-id' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(liveKit.createRoom).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
