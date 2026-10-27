import {
  Injectable,
  Inject,
  forwardRef,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';

export const AI_BOT_ID = '00000000-0000-4000-8000-0000000000a1';
export function aiQuestion(content: string): string | null {
  const match = content.match(/^\s*@ai(?:\s+|$)([\s\S]*)/i);
  return match ? match[1].trim().slice(0, 4000) || 'Bạn có thể giúp gì?' : null;
}
type RequestRow = {
  id: string;
  actor_id: string;
  chat_id: string;
  chat_type: 'CHANNEL' | 'DIRECT_MESSAGE';
  status: string;
  token: string | null;
  question_hash?: string | null;
  attachment_media_id?: string | null;
  attachment_hash?: string | null;
};
@Injectable()
export class ConversationAiService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private sweeping = false;
  private wakeScheduled = false;
  private rescan = false;
  private stopping = false;
  private readonly logger = new Logger(ConversationAiService.name);
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatSocketPublisher))
    private readonly publisher: ChatSocketPublisher,
    private readonly s3Service?: S3Service,
  ) {}
  enabled() {
    return process.env.CONVERSATION_AI_ENABLED === 'true';
  }
  onModuleInit() {
    if (!this.enabled()) return;
    if ((process.env.AI_COMMUNICATION_SERVICE_KEY?.length ?? 0) < 32)
      throw new Error('Configure AI_COMMUNICATION_SERVICE_KEY');
    this.timer = setInterval(() => void this.dispatch(), 10000);
    void this.dispatch();
  }
  onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
  }
  async register(
    message: {
      id: string;
      content?: string | null;
      type?: string;
      threadParentId?: string | null;
    },
    actorId: string,
    chatId: string,
    chatType: 'CHANNEL' | 'DIRECT_MESSAGE',
    tx: Prisma.TransactionClient,
    attachmentMediaId?: string,
  ) {
    if (
      attachmentMediaId !== undefined &&
      (typeof attachmentMediaId !== 'string' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          attachmentMediaId,
        ))
    )
      throw new BadRequestException('Mã file không hợp lệ.');
    if (
      attachmentMediaId &&
      (!this.enabled() ||
        message.type !== 'TEXT' ||
        !aiQuestion(message.content || ''))
    )
      throw new BadRequestException(
        'Yêu cầu tóm tắt tài liệu không hợp lệ hoặc AI chưa bật.',
      );
    if (
      !this.enabled() ||
      message.type !== 'TEXT' ||
      !aiQuestion(message.content || '')
    )
      return;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actorId},8087003))`;
    const [usage] = await tx.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) AS count FROM conversation_ai_requests WHERE actor_id=${actorId}::uuid AND created_at>now()-interval '1 minute'`;
    if (Number(usage.count) >= 10)
      throw new BadRequestException(
        'Bạn đã gọi AI quá nhiều lần. Vui lòng chờ một phút.',
      );
    let attachmentHash: string | null = null;
    if (attachmentMediaId) {
      const media = await this.summaryMedia(chatType, attachmentMediaId, tx);
      this.assertSummaryMedia(media, chatId, message.threadParentId ?? null);
      attachmentHash = this.mediaHash(media);
    }
    const hash = this.questionHash(message.content || '');
    await tx.$executeRaw`INSERT INTO conversation_ai_requests(id,actor_id,chat_id,chat_type,question_hash,attachment_media_id,attachment_hash) VALUES(${message.id}::uuid,${actorId}::uuid,${chatId}::uuid,${chatType},${hash},${attachmentMediaId ?? null}::uuid,${attachmentHash}) ON CONFLICT DO NOTHING`;
  }

  notify(message: { content?: string | null; type?: string }) {
    if (message.type !== 'TEXT' || !aiQuestion(message.content || '')) return;
    this.wake();
  }
  private wake() {
    if (!this.enabled() || this.stopping) return;
    if (this.sweeping) {
      this.rescan = true;
      return;
    }
    if (this.wakeScheduled) return;
    this.wakeScheduled = true;
    setImmediate(() => {
      this.wakeScheduled = false;
      if (!this.stopping) void this.dispatch();
    });
  }
  async dispatch() {
    if (this.sweeping || !this.enabled() || this.stopping) return;
    this.sweeping = true;
    try {
      const pending = await this.prisma.$queryRaw<
        RequestRow[]
      >`UPDATE conversation_ai_requests SET dispatch_after=now()+interval '30 seconds',dispatch_attempts=dispatch_attempts+1
        WHERE id IN (SELECT id FROM conversation_ai_requests WHERE status='QUEUED' AND dispatch_after<=now()
        ORDER BY dispatch_after,created_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING *`;
      for (let offset = 0; offset < pending.length; offset += 4) {
        await Promise.allSettled(
          pending.slice(offset, offset + 4).map(async (request) => {
            try {
              const response = await fetch(
                `${process.env.AI_SERVICE_URL || 'http://localhost:8087'}/internal/conversation-ai/${request.id}`,
                {
                  method: 'POST',
                  redirect: 'error',
                  signal: AbortSignal.timeout(5000),
                  headers: {
                    'x-internal-service-key':
                      process.env.AI_COMMUNICATION_SERVICE_KEY!,
                  },
                },
              );
              const ok = response.ok;
              await response.body?.cancel();
              if (!ok) throw new Error('Queue endpoint rejected request');
              await this.prisma
                .$executeRaw`UPDATE conversation_ai_requests SET dispatch_after=now()+interval '30 seconds' WHERE id=${request.id}::uuid AND status='QUEUED'`;
            } catch {
              await this.prisma
                .$executeRaw`UPDATE conversation_ai_requests SET dispatch_after=now()+make_interval(secs=>LEAST(300,power(2,LEAST(dispatch_attempts,8))::int)) WHERE id=${request.id}::uuid AND status='QUEUED'`;
              this.logger.warn('Conversation AI request dispatch failed');
            }
          }),
        );
      }
      // An unknown provider outcome is not automatically replayed.
      const abandoned = await this.prisma.$queryRaw<
        RequestRow[]
      >`SELECT * FROM conversation_ai_requests WHERE status='RUNNING' AND updated_at<now()-interval '5 minutes' LIMIT 20`;
      for (const request of abandoned) {
        try {
          await this.complete(
            request.id,
            request.token!,
            'Yêu cầu AI bị gián đoạn. Hãy gửi một tin @ai mới để thử lại.',
            true,
          );
        } catch {
          await this.prisma
            .$executeRaw`UPDATE conversation_ai_requests SET status='FAILED' WHERE id=${request.id}::uuid AND status='RUNNING'`;
        }
      }
    } catch {
      this.logger.warn('Conversation AI dispatch unavailable');
    } finally {
      await this.flushOutbox().catch(() =>
        this.logger.warn('Conversation AI outbox unavailable'),
      );
      this.sweeping = false;
      if (this.rescan) {
        this.rescan = false;
        this.wake();
      }
    }
  }
  private async request(id: string, token?: string) {
    const [r] = await this.prisma.$queryRaw<
      RequestRow[]
    >`SELECT * FROM conversation_ai_requests WHERE id=${id}::uuid`;
    if (!r || (token !== undefined && r.token !== token))
      throw new ForbiddenException();
    return r;
  }
  async authorized(r: RequestRow) {
    if (r.chat_type === 'CHANNEL') {
      const member = await this.prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId: r.chat_id, userId: r.actor_id },
        },
        include: { channel: true },
      });
      if (
        !member ||
        !(await this.prisma.spaceMember.findUnique({
          where: {
            spaceId_userId: {
              spaceId: member.channel.spaceId,
              userId: r.actor_id,
            },
          },
        }))
      )
        throw new ForbiddenException();
    } else if (
      !(await this.prisma.directConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: r.chat_id,
            userId: r.actor_id,
          },
        },
      }))
    )
      throw new ForbiddenException();
    const message =
      r.chat_type === 'CHANNEL'
        ? await this.prisma.message.findUnique({ where: { id: r.id } })
        : await this.prisma.directMessage.findUnique({ where: { id: r.id } });
    if (
      !message ||
      message.senderId !== r.actor_id ||
      message.recalled ||
      message.deletedAt ||
      message.type !== 'TEXT' ||
      !aiQuestion(message.content || '') ||
      (r.question_hash != null &&
        r.question_hash !== this.questionHash(message.content || '')) ||
      ('channelId' in message ? message.channelId : message.conversationId) !==
        r.chat_id
    )
      throw new ForbiddenException();
    if (message.threadParentId) {
      const parent =
        r.chat_type === 'CHANNEL'
          ? await this.prisma.message.findUnique({
              where: { id: message.threadParentId },
            })
          : await this.prisma.directMessage.findUnique({
              where: { id: message.threadParentId },
            });
      if (
        !parent ||
        parent.deletedAt ||
        parent.recalled ||
        ('channelId' in parent ? parent.channelId : parent.conversationId) !==
          r.chat_id
      )
        throw new ForbiddenException();
    }
    if (r.attachment_media_id) {
      const media = await this.summaryMedia(r.chat_type, r.attachment_media_id);
      this.assertSummaryMedia(media, r.chat_id, message.threadParentId);
      if (!r.attachment_hash || r.attachment_hash !== this.mediaHash(media))
        throw new ForbiddenException();
    }
    return message;
  }
  async claim(id: string) {
    const r = await this.request(id);
    let message: Awaited<ReturnType<ConversationAiService['authorized']>>;
    try {
      message = await this.authorized(r);
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
      await this.prisma
        .$executeRaw`UPDATE conversation_ai_requests SET status='CANCELLED' WHERE id=${id}::uuid AND status='QUEUED'`;
      return null;
    }
    const token = randomUUID();
    const hash = this.questionHash(message.content || '');
    const claimed = await this.prisma
      .$executeRaw`UPDATE conversation_ai_requests SET status='RUNNING',token=${token}::uuid,question_hash=coalesce(question_hash,${hash}),updated_at=now() WHERE id=${id}::uuid AND status='QUEUED'`;
    if (!claimed) return null;
    await this.publishTyping(r, message.threadParentId, true);
    return {
      question: aiQuestion(message.content || ''),
      token,
      ...(r.attachment_media_id ? { attachmentSummary: true } : {}),
    };
  }
  async validate(id: string, token: string) {
    const r = await this.request(id, token);
    if (r.status !== 'RUNNING') throw new ForbiddenException();
    const message = await this.authorized(r);
    const updated = await this.prisma
      .$executeRaw`UPDATE conversation_ai_requests SET updated_at=now() WHERE id=${id}::uuid AND token=${token}::uuid AND status='RUNNING'`;
    if (!updated) throw new ForbiddenException();
    await this.publishTyping(r, message.threadParentId, true);
    return { valid: true };
  }
  private async summaryMedia(
    chatType: string,
    id: string,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    if (
      typeof id !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        id,
      )
    )
      throw new BadRequestException('Mã file không hợp lệ.');
    const media =
      chatType === 'CHANNEL'
        ? await client.media.findUnique({
            where: { id },
            include: { message: true },
          })
        : await client.directMedia.findUnique({
            where: { id },
            include: { message: true },
          });
    if (!media) throw new ForbiddenException('File không còn tồn tại.');
    return media;
  }
  private assertSummaryMedia(
    media: Awaited<ReturnType<ConversationAiService['summaryMedia']>>,
    chatId: string,
    threadParentId: string | null,
  ) {
    const source = media.message;
    if (
      source.deletedAt ||
      source.recalled ||
      ('channelId' in source ? source.channelId : source.conversationId) !==
        chatId ||
      source.threadParentId !== threadParentId
    )
      throw new ForbiddenException(
        'Không có quyền đọc file trong cuộc hội thoại này.',
      );
    if (
      !media.name ||
      media.name.length > 300 ||
      !/\.(pdf|docx|txt|md)$/i.test(media.name) ||
      !Number.isSafeInteger(media.sizeBytes) ||
      media.sizeBytes <= 0 ||
      media.sizeBytes > 20 * 1024 * 1024
    )
      throw new BadRequestException(
        'Chỉ tóm tắt PDF, DOCX, TXT, MD tối đa 20 MiB/file.',
      );
    const prefix = `chat-media/${chatId}/`;
    const chatUpload =
      media.s3Key.startsWith(prefix) &&
      /^[a-f0-9-]{36}_[a-z0-9._-]+$/i.test(media.s3Key.slice(prefix.length));
    const documentUpload =
      /^documents\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_[a-z0-9._-]+$/i.test(
        media.s3Key,
      );
    if (!chatUpload && !documentUpload)
      throw new ForbiddenException(
        'File không thuộc kho đính kèm của cuộc hội thoại này.',
      );
  }
  private mediaHash(
    media: Awaited<ReturnType<ConversationAiService['summaryMedia']>>,
  ) {
    return createHash('sha256')
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
  }
  async attachment(id: string, token: string) {
    const r = await this.request(id, token);
    if (r.status !== 'RUNNING' || !r.attachment_media_id)
      throw new ForbiddenException();
    await this.authorized(r);
    const media = await this.summaryMedia(r.chat_type, r.attachment_media_id);
    if (media.s3Key.startsWith('documents/')) {
      // Document Service must validate this registered version and actor before signing.
      return {
        name: media.name,
        sizeBytes: media.sizeBytes,
        document: { s3Key: media.s3Key, userId: r.actor_id },
      };
    }
    if (!this.s3Service) throw new ServiceUnavailableException();
    const downloadUrl = await this.s3Service.generateAttachmentDownloadUrl(
      media.s3Key,
    );
    await this.authorized(r);
    return { name: media.name, sizeBytes: media.sizeBytes, downloadUrl };
  }
  async history(id: string, token: string) {
    const r = await this.request(id, token);
    if (r.status !== 'RUNNING') throw new ForbiddenException();
    const m = await this.authorized(r);
    const table = Prisma.raw(
      r.chat_type === 'CHANNEL' ? 'messages' : 'direct_messages',
    );
    const scope = Prisma.raw(
      r.chat_type === 'CHANNEL' ? 'channel_id' : 'conversation_id',
    );
    const thread = m.threadParentId
      ? Prisma.sql`(thread_parent_id=${m.threadParentId}::uuid OR m.id=${m.threadParentId}::uuid)`
      : Prisma.sql`thread_parent_id IS NULL`;
    const rows = await this.prisma.$queryRaw<
      { content: string; senderName: string; createdAt: Date }[]
    >(Prisma.sql`
      SELECT left(m.content,2000) AS content,left(coalesce(p.full_name,'Participant'),120) AS "senderName",m.created_at AS "createdAt"
      FROM ${table} m LEFT JOIN user_profile_snapshots p ON p.user_id=m.sender_id
      WHERE ${scope}=${r.chat_id}::uuid AND ${thread} AND m.deleted_at IS NULL AND NOT m.recalled AND m.type='TEXT' AND nullif(btrim(m.content),'') IS NOT NULL
      AND (m.created_at,m.id)<(SELECT created_at,id FROM ${table} WHERE id=${m.id}::uuid) ORDER BY m.created_at DESC,m.id DESC LIMIT 30`);
    await this.authorized(r);
    const bytesPerMessage = Math.floor(24000 / Math.max(rows.length, 1));
    return rows.reverse().map((item) =>
      Buffer.byteLength(item.content) <= bytesPerMessage
        ? item
        : {
            ...item,
            content: Buffer.from(item.content)
              .subarray(0, bytesPerMessage)
              .toString('utf8')
              .replace(/\uFFFD$/, ''),
            truncated: true,
          },
    );
  }
  async complete(id: string, token: string, content: string, failed = false) {
    if (!content.trim() || content.length > 20000)
      throw new BadRequestException();
    const r = await this.request(id, token);
    const original = await this.authorized(r);
    const replyId = this.replyId(id);
    await this.prisma.$transaction(async (tx) => {
      const changed =
        await tx.$executeRaw`UPDATE conversation_ai_requests SET status=${failed ? 'FAILED' : 'COMPLETED'},updated_at=now() WHERE id=${id}::uuid AND status='RUNNING' AND token=${token}::uuid`;
      if (!changed) return;
      const data = {
        id: replyId,
        senderId: AI_BOT_ID,
        content,
        type: 'AI' as const,
        threadParentId: original.threadParentId,
      };
      if (r.chat_type === 'CHANNEL') {
        await tx.message.create({ data: { ...data, channelId: r.chat_id } });
        await tx.channel.update({
          where: { id: r.chat_id },
          data: { updatedAt: new Date() },
        });
        if (original.threadParentId)
          await tx.message.update({
            where: { id: original.threadParentId },
            data: {
              threadReplyCount: { increment: 1 },
              threadLastReplyAt: new Date(),
            },
          });
      } else {
        await tx.directMessage.create({
          data: { ...data, conversationId: r.chat_id },
        });
        await tx.directConversation.update({
          where: { id: r.chat_id },
          data: { updatedAt: new Date() },
        });
        if (original.threadParentId)
          await tx.directMessage.update({
            where: { id: original.threadParentId },
            data: {
              threadReplyCount: { increment: 1 },
              threadLastReplyAt: new Date(),
            },
          });
      }
      await tx.$executeRaw`INSERT INTO conversation_ai_outbox(request_id,reply_id) VALUES(${id}::uuid,${replyId}::uuid) ON CONFLICT DO NOTHING`;
    });
    await this.publishTyping(r, original.threadParentId, false);
    // Delivery failure must not turn an already saved answer into a failed model job.
    await this.flushOutbox().catch(() =>
      this.logger.warn('Conversation AI outbox unavailable'),
    );
    return { id: replyId };
  }
  async flushOutbox() {
    const token = randomUUID();
    const events = await this.prisma.$queryRaw<
      { request_id: string; reply_id: string }[]
    >`
      UPDATE conversation_ai_outbox SET lease_token=${token}::uuid,lease_until=now()+interval '30 seconds',attempts=attempts+1
      WHERE request_id IN (
        SELECT request_id FROM conversation_ai_outbox WHERE status='PENDING' AND next_attempt_at<=now()
        AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at LIMIT 20 FOR UPDATE SKIP LOCKED
      ) RETURNING request_id,reply_id`;
    await Promise.allSettled(
      events.map(async (event) => {
        try {
          await this.publishReply(event.request_id, event.reply_id);
          await this.prisma
            .$executeRaw`UPDATE conversation_ai_outbox SET status='PUBLISHED',lease_token=NULL,lease_until=NULL WHERE request_id=${event.request_id}::uuid AND lease_token=${token}::uuid`;
        } catch (error) {
          if (error instanceof ForbiddenException) {
            await this.prisma
              .$executeRaw`UPDATE conversation_ai_outbox SET status='CANCELLED',lease_token=NULL,lease_until=NULL WHERE request_id=${event.request_id}::uuid AND lease_token=${token}::uuid`;
          } else {
            await this.prisma
              .$executeRaw`UPDATE conversation_ai_outbox SET lease_token=NULL,lease_until=NULL,next_attempt_at=now()+make_interval(secs=>LEAST(300,power(2,LEAST(attempts,8))::int)) WHERE request_id=${event.request_id}::uuid AND lease_token=${token}::uuid`;
            this.logger.warn('Conversation AI reply delivery will retry');
          }
        }
      }),
    );
  }
  private async publishReply(id: string, replyId: string) {
    this.publisher.assertReady();
    const r = await this.request(id);
    await this.authorized(r);
    const message =
      r.chat_type === 'CHANNEL'
        ? await this.prisma.message.findUnique({ where: { id: replyId } })
        : await this.prisma.directMessage.findUnique({
            where: { id: replyId },
          });
    if (!message || message.deletedAt || message.recalled)
      throw new ForbiddenException();
    const followers = message.threadParentId
      ? await (r.chat_type === 'CHANNEL'
          ? this.prisma.threadFollower.findMany({
              where: { messageId: message.threadParentId },
              select: { userId: true },
            })
          : this.prisma.directThreadFollower.findMany({
              where: { messageId: message.threadParentId },
              select: { userId: true },
            }))
      : undefined;
    await this.authorized(r);
    const payload = {
      ...message,
      aiRequestId: id,
      medias: [],
      chatId: r.chat_id,
      chatType: r.chat_type as CHAT_CONTEXT_TYPE,
      threadFollowers: followers?.map((follower) => follower.userId),
      senderProfile: {
        id: AI_BOT_ID,
        userId: AI_BOT_ID,
        fullName: 'AI',
        email: null,
        avatarUrl: null,
      },
    };
    if (r.chat_type === 'CHANNEL')
      await this.publisher.publishChannelMessageCreated(r.chat_id, payload);
    else await this.publisher.publishDirectMessageCreated(r.chat_id, payload);
  }
  private async publishTyping(
    r: RequestRow,
    threadParentId: string | null,
    isTyping: boolean,
  ) {
    try {
      await this.publisher.publishAiTyping({
        requestId: r.id,
        chatId: r.chat_id,
        chatType: r.chat_type,
        threadParentId,
        isTyping,
      });
    } catch {
      // Presence is ephemeral; it must never fail a claim, heartbeat or saved reply.
      this.logger.debug('Conversation AI typing event unavailable');
    }
  }
  private questionHash(content: string) {
    return createHash('sha256')
      .update(aiQuestion(content) || '')
      .digest('hex');
  }
  private replyId(id: string) {
    // Deterministic UUID keeps completion delivery idempotent without schema changes to messages.
    const h = createHash('sha256')
      .update(`conversation-ai:${id}`)
      .digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
  }
}
