import { ConversationAiService } from './conversation-ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';

describe.each(['CHANNEL', 'DIRECT_MESSAGE'] as const)(
  'AI %s reply delivery',
  (chatType) => {
    it('includes thread followers so the client can update unread threads', async () => {
      const event = { request_id: 'request', reply_id: 'reply' };
      const request = { id: 'request', chat_type: chatType, chat_id: 'chat' };
      const reply = { id: 'reply', content: 'answer', threadParentId: 'root' };
      const followers = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ userId: 'actor' }, { userId: 'reader' }]),
      };
      const prisma = {
        $queryRaw: jest
          .fn()
          .mockResolvedValueOnce([event])
          .mockResolvedValueOnce([request]),
        $executeRaw: jest.fn().mockResolvedValue(1),
        message: { findUnique: jest.fn().mockResolvedValue(reply) },
        directMessage: { findUnique: jest.fn().mockResolvedValue(reply) },
        threadFollower: followers,
        directThreadFollower: followers,
      };
      const publish = jest.fn().mockResolvedValue(undefined);
      const publisher = {
        assertReady: jest.fn(),
        publishChannelMessageCreated: publish,
        publishDirectMessageCreated: publish,
      };
      const service = new ConversationAiService(
        prisma as unknown as PrismaService,
        publisher as unknown as ChatSocketPublisher,
      );
      jest
        .spyOn(service, 'authorized')
        .mockResolvedValue({ threadParentId: 'root' } as Awaited<
          ReturnType<ConversationAiService['authorized']>
        >);
      await service.flushOutbox();
      expect(publish).toHaveBeenCalledWith(
        'chat',
        expect.objectContaining({
          id: 'reply',
          threadParentId: 'root',
          threadFollowers: ['actor', 'reader'],
        }),
      );
      expect(followers.findMany).toHaveBeenCalledWith({
        where: { messageId: 'root' },
        select: { userId: true },
      });
    });
  },
);
