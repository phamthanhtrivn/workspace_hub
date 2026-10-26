import { ForbiddenException } from '@nestjs/common';
import { ConversationAiService } from './conversation-ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';

describe.each(['CHANNEL', 'DIRECT_MESSAGE'] as const)(
  'AI %s typing lifecycle',
  (chatType) => {
    function setup(threadParentId: string | null = null) {
      const request = {
        id: 'request',
        actor_id: 'actor',
        chat_id: 'chat',
        chat_type: chatType,
        status: 'RUNNING',
        token: 'token',
      };
      const message = { content: '@ai hello', threadParentId };
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        message: { create: jest.fn(), update: jest.fn() },
        directMessage: { create: jest.fn(), update: jest.fn() },
        channel: { update: jest.fn() },
        directConversation: { update: jest.fn() },
      };
      const prisma = {
        $queryRaw: jest.fn().mockResolvedValue([request]),
        $executeRaw: jest.fn().mockResolvedValue(1),
        $transaction: jest.fn((fn: (client: typeof tx) => Promise<void>) =>
          fn(tx),
        ),
      };
      const publishAiTyping = jest.fn().mockResolvedValue(undefined);
      const service = new ConversationAiService(
        prisma as unknown as PrismaService,
        { publishAiTyping } as unknown as ChatSocketPublisher,
      );
      const auth = jest
        .spyOn(service, 'authorized')
        .mockResolvedValue(
          message as Awaited<ReturnType<ConversationAiService['authorized']>>,
        );
      jest.spyOn(service, 'flushOutbox').mockResolvedValue();
      return { service, prisma, auth, publishAiTyping, request, tx };
    }
    it.each([null, 'root'])(
      'starts on a successful claim and refreshes in its scope (%s)',
      async (threadParentId) => {
        const { service, publishAiTyping } = setup(threadParentId);
        const claim = await service.claim('request');
        expect(claim?.question).toBe('hello');
        expect(claim?.token).toMatch(/^[0-9a-f-]{36}$/);
        await service.validate('request', 'token');
        expect(publishAiTyping).toHaveBeenCalledTimes(2);
        expect(publishAiTyping).toHaveBeenLastCalledWith({
          requestId: 'request',
          chatId: 'chat',
          chatType,
          threadParentId,
          isTyping: true,
        });
      },
    );
    it('does not emit for a duplicate claim or invalid token/membership', async () => {
      const { service, prisma, auth, publishAiTyping } = setup();
      prisma.$executeRaw.mockResolvedValue(0);
      expect(await service.claim('request')).toBeNull();
      await expect(service.validate('request', 'wrong')).rejects.toThrow(
        ForbiddenException,
      );
      auth.mockRejectedValue(new ForbiddenException());
      expect(await service.claim('request')).toBeNull();
      await expect(service.validate('request', 'token')).rejects.toThrow(
        ForbiddenException,
      );
      expect(publishAiTyping).not.toHaveBeenCalled();
    });
    it.each([false, true])(
      'stops after saving a reply (failed=%s)',
      async (failed) => {
        const { service, publishAiTyping, tx } = setup('root');
        await service.complete('request', 'token', 'answer', failed);
        expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
        expect(publishAiTyping).toHaveBeenCalledWith({
          requestId: 'request',
          chatId: 'chat',
          chatType,
          threadParentId: 'root',
          isTyping: false,
        });
      },
    );
    it('does not stop before a failed database transaction commits', async () => {
      const { service, prisma, publishAiTyping } = setup();
      prisma.$transaction.mockRejectedValue(new Error('rollback'));
      await expect(
        service.complete('request', 'token', 'answer'),
      ).rejects.toThrow('rollback');
      expect(publishAiTyping).not.toHaveBeenCalled();
    });
    it('keeps generation and completion working when presence delivery fails', async () => {
      const { service, publishAiTyping } = setup();
      publishAiTyping.mockRejectedValue(new Error('socket offline'));
      await expect(service.claim('request')).resolves.toBeTruthy();
      await expect(service.validate('request', 'token')).resolves.toEqual({
        valid: true,
      });
      const reply = await service.complete('request', 'token', 'answer');
      expect(reply.id).toMatch(/^[0-9a-f-]{36}$/);
    });
  },
);

describe('AI typing delivery', () => {
  it.each([CHAT_CONTEXT_TYPE.CHANNEL, CHAT_CONTEXT_TYPE.DIRECT_MESSAGE])(
    'resolves current authorized member rooms for %s',
    async (chatType) => {
      const emitToRooms = jest.fn();
      const getChannelTargetRooms = jest
        .fn()
        .mockResolvedValue(['channel-members']);
      const getDirectTargetRooms = jest.fn().mockResolvedValue(['dm-members']);
      const publisher = new ChatSocketPublisher(
        { emitToRooms } as unknown as ConstructorParameters<
          typeof ChatSocketPublisher
        >[0],
        {
          getChannelTargetRooms,
          getDirectTargetRooms,
        } as unknown as ConstructorParameters<typeof ChatSocketPublisher>[1],
        {} as ConstructorParameters<typeof ChatSocketPublisher>[2],
      );
      const payload = {
        requestId: 'r',
        chatId: 'chat',
        chatType,
        threadParentId: null,
        isTyping: true,
      };
      await publisher.publishAiTyping(payload);
      expect(emitToRooms).toHaveBeenCalledWith(
        chatType === CHAT_CONTEXT_TYPE.CHANNEL
          ? ['channel-members']
          : ['dm-members'],
        ChatEvent.AI_TYPING,
        payload,
      );
      expect(
        chatType === CHAT_CONTEXT_TYPE.CHANNEL
          ? getChannelTargetRooms
          : getDirectTargetRooms,
      ).toHaveBeenCalledWith('chat');
    },
  );
});
