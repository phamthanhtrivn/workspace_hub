import { MessageType, SpaceRole } from '@prisma/client';
import { MessageService } from './message.service';

describe('MessageService task card permission', () => {
  function createService(role: SpaceRole, createdBy = 'owner-1') {
    const tx = {
      channelMember: {
        findUnique: jest.fn().mockResolvedValue({
          channel: {
            spaceId: 'space-1',
            space: { createdBy },
            setting: {
              allowSendMessage: true,
              allowCreateTask: false,
            },
          },
        }),
        update: jest.fn(),
      },
      spaceMember: { findUnique: jest.fn().mockResolvedValue({ role }) },
      message: { create: jest.fn().mockResolvedValue({ id: 'message-1' }) },
      channel: { update: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const profiles = { attachSenderProfileToMessage: jest.fn((message) => message) };
    const service = new MessageService(
      prisma as any,
      {} as any,
      profiles as any,
      {} as any,
    );
    return { service, tx };
  }

  it('blocks members from posting task cards when disabled', async () => {
    const { service, tx } = createService(SpaceRole.MEMBER);
    await expect(service.createMessage(
      'channel-1', 'member-1', '{"type":"TASK","taskId":"task-1"}', MessageType.TEXT,
    )).rejects.toThrow('Task creation is disabled in this channel');
    expect(tx.message.create).not.toHaveBeenCalled();
  });

  it('still allows ordinary messages and admin task cards', async () => {
    const member = createService(SpaceRole.MEMBER);
    await expect(member.service.createMessage(
      'channel-1', 'member-1', 'ordinary message', MessageType.TEXT,
    )).resolves.toEqual({ id: 'message-1' });

    const admin = createService(SpaceRole.ADMIN);
    await expect(admin.service.createMessage(
      'channel-1', 'admin-1', '{"type":"TASK"}', MessageType.TEXT,
    )).resolves.toEqual({ id: 'message-1' });

    const owner = createService(SpaceRole.MEMBER, 'owner-1');
    await expect(owner.service.createMessage(
      'channel-1', 'owner-1', '{"type":"TASK"}', MessageType.TEXT,
    )).resolves.toEqual({ id: 'message-1' });
  });
});
