import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { ChannelAccessService } from '../channel/access/channel-access.service';
import { DirectMessagePermissionService } from '../direct-message/direct-message-permission.service';
import { isServiceKeyValid } from '../../common/auth/service-key';
import { isVoiceTranscriptionEnabled } from './voice-transcript.config';
import { isTranscriptAudio } from './voice-transcript-audio';
import {
  VOICE_TRANSCRIPT,
  VoiceChatType,
} from './types/voice-transcript.constants';

@Injectable()
export class VoiceTranscriptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly channels: ChannelAccessService,
    private readonly direct: DirectMessagePermissionService,
  ) {}

  authorizeSource(key?: string) {
    const expected = process.env.AI_TO_COMMUNICATION_KEY || '';
    if (!isVoiceTranscriptionEnabled() || expected.length < 32)
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    if (!isServiceKeyValid(key, expected)) throw new UnauthorizedException();
  }

  async attachment(id: string, actorId: string, chatType: VoiceChatType) {
    if (
      ![VoiceChatType.CHANNEL, VoiceChatType.DIRECT_MESSAGE].includes(chatType)
    )
      throw new BadRequestException(VOICE_TRANSCRIPT.unsupported);
    const where = { id, message: { recalled: false, deletedAt: null } };
    const media =
      chatType === VoiceChatType.CHANNEL
        ? await this.prisma.media.findFirst({
            where,
            include: { message: { select: { channelId: true } } },
          })
        : await this.prisma.directMedia.findFirst({
            where,
            include: { message: { select: { conversationId: true } } },
          });
    if (!media) throw new NotFoundException(VOICE_TRANSCRIPT.missing);
    if ('channelId' in media.message)
      await this.channels.assertPrivateAccess(media.message.channelId, actorId);
    else await this.direct.assertCanRead(media.message.conversationId, actorId);
    if (
      !isTranscriptAudio(media) ||
      media.sizeBytes < 1 ||
      media.sizeBytes > VOICE_TRANSCRIPT.maxBytes
    ) {
      throw new BadRequestException(VOICE_TRANSCRIPT.unsupported);
    }
    const revision = createHash('sha256')
      .update(
        JSON.stringify([
          chatType,
          media.id,
          media.s3Key,
          media.mimeType,
          media.sizeBytes,
        ]),
      )
      .digest('hex');
    return { media, revision };
  }

  async source(id: string, actorId: string, chatType: VoiceChatType) {
    const { media, revision } = await this.attachment(id, actorId, chatType);
    return {
      message: VOICE_TRANSCRIPT.sourceMessage,
      data: {
        mediaId: id,
        chatType,
        revision,
        sizeBytes: media.sizeBytes,
        url: await this.s3.generateAttachmentDownloadUrl(media.s3Key),
      },
    };
  }

  async proxy(
    id: string,
    actorId: string,
    chatType: VoiceChatType,
    start: boolean,
  ) {
    const original = await this.attachment(id, actorId, chatType);
    const key = process.env.COMMUNICATION_TO_AI_KEY || '';
    const baseUrl = process.env.AI_SERVICE_URL;
    if (!isVoiceTranscriptionEnabled() || key.length < 32 || !baseUrl)
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    let response: Response;
    try {
      response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/${VOICE_TRANSCRIPT.internalRoute}/${id}${start ? '' : '/status'}`,
        {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(VOICE_TRANSCRIPT.timeoutMs),
          headers: {
            'content-type': 'application/json',
            'x-internal-service-key': key,
          },
          body: JSON.stringify({ actorId, chatType }),
        },
      );
    } catch {
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    }
    const reader = response.body?.getReader();
    if (!reader)
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.length;
        if (size > VOICE_TRANSCRIPT.maxResponseBytes)
          throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
        chunks.push(next.value);
      }
    } catch {
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    let result: unknown;
    try {
      result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    }
    if (
      !result ||
      typeof result !== 'object' ||
      !('status' in result) ||
      !['NOT_CREATED', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'].includes(
        String(result.status),
      )
    ) {
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    }
    const latest = await this.attachment(id, actorId, chatType);
    if (latest.revision !== original.revision)
      throw new NotFoundException(VOICE_TRANSCRIPT.missing);
    const payload = result as {
      status: string;
      text?: unknown;
      error?: unknown;
    };
    if (
      payload.status === 'COMPLETED' &&
      (typeof payload.text !== 'string' ||
        payload.text.length > VOICE_TRANSCRIPT.maxText)
    )
      throw new ServiceUnavailableException(VOICE_TRANSCRIPT.unavailable);
    return {
      message: VOICE_TRANSCRIPT.responseMessage,
      data: {
        status: payload.status,
        text: payload.status === 'COMPLETED' ? (payload.text as string) : null,
        error:
          typeof payload.error === 'string'
            ? payload.error.slice(0, VOICE_TRANSCRIPT.maxError)
            : null,
      },
    };
  }
}
