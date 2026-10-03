import { DirectMessagePrivacyConsumer } from './direct-message-privacy.consumer';
import { ChatEvent } from '../socket/chat/chat-socket.events';

describe('DirectMessagePrivacyConsumer', () => {
  const ownerId = '11111111-1111-4111-8111-111111111111';
  const peerId = '22222222-2222-4222-8222-222222222222';

  it('notifies only the other participant in empty conversations', async () => {
    const prisma = {
      directConversation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'empty-dm',
            participants: [{ userId: ownerId }, { userId: peerId }],
          },
        ]),
      },
    };
    const emitter = { emitToUser: jest.fn() };
    const consumer = new DirectMessagePrivacyConsumer(
      prisma as any,
      emitter as any,
    );

    await consumer.handlePrivacyChanged({
      userId: ownerId,
      allowNewDirectMessages: false,
    });

    expect(prisma.directConversation.findMany).toHaveBeenCalledWith({
      where: {
        participants: { some: { userId: ownerId } },
        messages: { none: {} },
      },
      select: {
        id: true,
        participants: { select: { userId: true } },
      },
    });
    expect(emitter.emitToUser).toHaveBeenCalledTimes(1);
    expect(emitter.emitToUser).toHaveBeenCalledWith(
      peerId,
      ChatEvent.DIRECT_MESSAGE_PERMISSION_UPDATED,
      {
        conversationId: 'empty-dm',
        recipientId: ownerId,
        allowNewDirectMessages: false,
      },
    );
  });

  it('ignores malformed privacy events', async () => {
    const prisma = { directConversation: { findMany: jest.fn() } };
    const consumer = new DirectMessagePrivacyConsumer(prisma as any, {} as any);
    await consumer.handlePrivacyChanged({
      userId: ownerId,
      allowNewDirectMessages: undefined,
    } as any);
    expect(prisma.directConversation.findMany).not.toHaveBeenCalled();
  });
});
