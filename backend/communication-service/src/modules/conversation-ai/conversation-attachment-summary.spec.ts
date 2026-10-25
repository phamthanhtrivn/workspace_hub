import { createHash } from 'node:crypto';
import { ConversationAiService } from './conversation-ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { S3Service } from '../../infrastructure/s3/s3.service';

const mediaId = '11111111-1111-4111-8111-111111111111';
describe.each(['CHANNEL', 'DIRECT_MESSAGE'] as const)(
  'attachment summary in %s',
  (chatType) => {
    function setup(documents = false) {
      const source = {
        id: 'source',
        senderId: 'another-member',
        channelId: 'chat',
        conversationId: 'chat',
        threadParentId: null as string | null,
        deletedAt: null as Date | null,
        recalled: false,
      };
      const media = {
        id: mediaId,
        messageId: source.id,
        name: 'sample.pdf',
        s3Key: documents
          ? `documents/${mediaId}/${mediaId}_sample.pdf`
          : `chat-media/chat/${mediaId}_sample.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 42,
        message: source,
      };
      const trigger = {
        id: 'trigger',
        senderId: 'actor',
        channelId: 'chat',
        conversationId: 'chat',
        content: '@ai Tóm tắt tài liệu',
        type: 'TEXT',
        threadParentId: null,
        recalled: false,
        deletedAt: null,
      };
      const attachmentHash = createHash('sha256')
        .update(
          JSON.stringify([
            media.id,
            media.messageId,
            media.name,
            media.s3Key,
            media.mimeType,
            media.sizeBytes,
          ]),
        )
        .digest('hex');
      const request = {
        id: trigger.id,
        actor_id: 'actor',
        chat_id: 'chat',
        chat_type: chatType,
        status: 'RUNNING',
        token: 'token',
        attachment_media_id: mediaId,
        attachment_hash: attachmentHash,
      };
      const prisma = {
        $queryRaw: jest.fn().mockResolvedValue([request]),
        $executeRaw: jest.fn().mockResolvedValue(1),
        channelMember: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ channel: { spaceId: 'space' } }),
        },
        spaceMember: { findUnique: jest.fn().mockResolvedValue({}) },
        directConversationParticipant: {
          findUnique: jest.fn().mockResolvedValue({}),
        },
        message: { findUnique: jest.fn().mockResolvedValue(trigger) },
        directMessage: { findUnique: jest.fn().mockResolvedValue(trigger) },
        media: {
          findUnique: jest
            .fn()
            .mockImplementation(() => Promise.resolve(media)),
        },
        directMedia: {
          findUnique: jest
            .fn()
            .mockImplementation(() => Promise.resolve(media)),
        },
      };
      // Match the actual Prisma union shape for each source.
      if (chatType === 'DIRECT_MESSAGE')
        delete (source as Partial<typeof source>).channelId;
      if (chatType === 'DIRECT_MESSAGE')
        delete (trigger as Partial<typeof trigger>).channelId;
      const s3 = {
        generateAttachmentDownloadUrl: jest
          .fn()
          .mockResolvedValue('https://storage.example.test/signed'),
      };
      const publisher = {
        publishAiTyping: jest.fn().mockResolvedValue(undefined),
      };
      const service = new ConversationAiService(
        prisma as unknown as PrismaService,
        publisher as unknown as ChatSocketPublisher,
        s3 as unknown as S3Service,
      );
      return { service, prisma, s3, source, media, trigger, request };
    }
    it('binds a pointer and immutable media snapshot in the send transaction', async () => {
      const old = process.env.CONVERSATION_AI_ENABLED;
      process.env.CONVERSATION_AI_ENABLED = 'true';
      try {
        const { service, prisma, trigger } = setup();
        prisma.$queryRaw.mockResolvedValue([{ count: 0n }]);
        await service.register(
          trigger,
          'actor',
          'chat',
          chatType,
          prisma as unknown as Parameters<ConversationAiService['register']>[4],
          mediaId,
        );
        const calls = prisma.$executeRaw.mock.calls as unknown[][];
        expect(String(calls[1][0])).toContain('attachment_media_id');
        expect(calls[1]).toContain(mediaId);
      } finally {
        if (old === undefined) delete process.env.CONVERSATION_AI_ENABLED;
        else process.env.CONVERSATION_AI_ENABLED = old;
      }
    });
    it('allows another member’s attachment and returns only an authorized short-lived manifest', async () => {
      const { service, s3, media } = setup();
      expect(await service.attachment('trigger', 'token')).toEqual({
        name: media.name,
        sizeBytes: 42,
        downloadUrl: 'https://storage.example.test/signed',
      });
      expect(s3.generateAttachmentDownloadUrl).toHaveBeenCalledWith(
        media.s3Key,
      );
      expect((await service.claim('trigger'))?.attachmentSummary).toBe(true);
    });
    it('delegates My Documents files to Document Service with the bound request actor, never signs them directly', async () => {
      const { service, media, s3 } = setup(true);
      expect(await service.attachment('trigger', 'token')).toEqual({
        name: media.name,
        sizeBytes: media.sizeBytes,
        document: { s3Key: media.s3Key, userId: 'actor' },
      });
      expect(s3.generateAttachmentDownloadUrl).not.toHaveBeenCalled();
    });
    it.each([
      'wrong-chat',
      'wrong-thread',
      'recalled',
      'deleted',
      'changed',
      'oversized',
      'unsupported',
      'other-storage',
    ])('rejects %s before generating a URL', async (scenario) => {
      const { service, source, media, s3 } = setup();
      if (scenario === 'wrong-chat') {
        source.channelId = 'other';
        source.conversationId = 'other';
      }
      if (scenario === 'wrong-thread') source.threadParentId = 'other-root';
      if (scenario === 'recalled') source.recalled = true;
      if (scenario === 'deleted') source.deletedAt = new Date();
      if (scenario === 'changed') media.name = 'replacement.pdf';
      if (scenario === 'oversized') media.sizeBytes = 21 * 1024 * 1024;
      if (scenario === 'unsupported') media.name = 'movie.mp4';
      if (scenario === 'other-storage')
        media.s3Key = `document/private/${mediaId}_sample.pdf`;
      await expect(service.attachment('trigger', 'token')).rejects.toThrow();
      expect(s3.generateAttachmentDownloadUrl).not.toHaveBeenCalled();
    });
    it('denies revoked membership, wrong token, finished jobs and ordinary chat requests', async () => {
      const { service, prisma, s3, request } = setup();
      await expect(service.attachment('trigger', 'wrong')).rejects.toThrow();
      prisma.$queryRaw.mockResolvedValue([
        { ...request, attachment_media_id: null },
      ]);
      await expect(service.attachment('trigger', 'token')).rejects.toThrow();
      prisma.$queryRaw.mockResolvedValue([{ ...request, status: 'COMPLETED' }]);
      await expect(service.attachment('trigger', 'token')).rejects.toThrow();
      prisma.$queryRaw.mockResolvedValue([request]);
      prisma.channelMember.findUnique.mockResolvedValue(null);
      prisma.directConversationParticipant.findUnique.mockResolvedValue(null);
      await expect(service.attachment('trigger', 'token')).rejects.toThrow();
      expect(s3.generateAttachmentDownloadUrl).not.toHaveBeenCalled();
    });
    it('revalidates after URL signing and denies a source recalled during signing', async () => {
      const { service, source, s3 } = setup();
      s3.generateAttachmentDownloadUrl.mockImplementation(() => {
        source.recalled = true;
        return Promise.resolve('https://storage.example.test/signed');
      });
      await expect(service.attachment('trigger', 'token')).rejects.toThrow();
    });
  },
);
