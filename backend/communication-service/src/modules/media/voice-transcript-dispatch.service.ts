import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { VoiceTranscriptService } from './voice-transcript.service';
import { isVoiceTranscriptionEnabled } from './voice-transcript.config';
import { isTranscriptAudio } from './voice-transcript-audio';
import {
  VOICE_TRANSCRIPT,
  VoiceChatType,
  VoiceTranscriptDispatchStatus,
} from './types/voice-transcript.constants';

interface TranscriptDispatch {
  media_id: string;
  actor_id: string;
  chat_type: VoiceChatType;
  attempts: number;
}

@Injectable()
export class VoiceTranscriptDispatchService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(VoiceTranscriptDispatchService.name);
  private timer?: ReturnType<typeof setInterval>;
  private dispatching?: Promise<void>;
  private wakeScheduled = false;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly transcripts: VoiceTranscriptService,
  ) {}

  onModuleInit() {
    if (!isVoiceTranscriptionEnabled()) return;
    this.timer = setInterval(
      () => void this.dispatch(),
      VOICE_TRANSCRIPT.dispatchIntervalMs,
    );
    this.notify();
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.dispatching;
  }

  async register(
    medias: {
      id: string;
      name?: string;
      mimeType: string;
      sizeBytes: number;
    }[],
    actorId: string,
    chatType: VoiceChatType,
    tx: Prisma.TransactionClient,
  ) {
    if (!isVoiceTranscriptionEnabled()) return;
    for (const media of medias) {
      if (
        !isTranscriptAudio(media) ||
        media.sizeBytes < 1 ||
        media.sizeBytes > VOICE_TRANSCRIPT.maxBytes
      )
        continue;
      await tx.$executeRaw`
        INSERT INTO voice_transcript_requests(media_id,actor_id,chat_type)
        VALUES(${media.id}::uuid,${actorId}::uuid,${chatType}) ON CONFLICT DO NOTHING`;
    }
  }

  notify() {
    if (!isVoiceTranscriptionEnabled() || this.stopping || this.wakeScheduled)
      return;
    this.wakeScheduled = true;
    setImmediate(() => {
      this.wakeScheduled = false;
      void this.dispatch();
    });
  }

  dispatch(): Promise<void> {
    if (this.stopping || !isVoiceTranscriptionEnabled())
      return Promise.resolve();
    if (!this.dispatching) {
      this.dispatching = this.flush()
        .catch(() => this.logger.warn(VOICE_TRANSCRIPT.dispatchUnavailable))
        .finally(() => {
          this.dispatching = undefined;
        });
    }
    return this.dispatching;
  }

  private async flush() {
    const token = randomUUID();
    const pending = await this.prisma.$queryRaw<TranscriptDispatch[]>`
      UPDATE voice_transcript_requests SET lease_token=${token}::uuid,
        lease_until=now()+make_interval(secs=>${VOICE_TRANSCRIPT.dispatchLeaseSeconds}),attempts=attempts+1
      WHERE (media_id,chat_type) IN (
        SELECT media_id,chat_type FROM voice_transcript_requests
        WHERE status='PENDING' AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now())
        ORDER BY next_attempt_at,media_id LIMIT ${VOICE_TRANSCRIPT.dispatchBatchSize} FOR UPDATE SKIP LOCKED
      ) RETURNING media_id,actor_id,chat_type,attempts`;
    const results = await Promise.allSettled(
      pending.map((request) => this.deliver(request, token)),
    );
    if (results.some((result) => result.status === 'rejected'))
      this.logger.warn(VOICE_TRANSCRIPT.dispatchUnavailable);
  }

  private async deliver(request: TranscriptDispatch, token: string) {
    let status = VoiceTranscriptDispatchStatus.DISPATCHED;
    try {
      if (request.attempts > VOICE_TRANSCRIPT.dispatchAttempts) {
        status = VoiceTranscriptDispatchStatus.FAILED;
      } else {
        await this.transcripts.proxy(
          request.media_id,
          request.actor_id,
          request.chat_type,
          true,
        );
      }
    } catch (error) {
      const permanent =
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException;
      status = permanent
        ? VoiceTranscriptDispatchStatus.CANCELLED
        : request.attempts >= VOICE_TRANSCRIPT.dispatchAttempts
          ? VoiceTranscriptDispatchStatus.FAILED
          : VoiceTranscriptDispatchStatus.PENDING;
      this.logger.warn(VOICE_TRANSCRIPT.dispatchFailed);
    }
    const retrySeconds =
      VOICE_TRANSCRIPT.dispatchRetrySeconds * 2 ** (request.attempts - 1);
    await this.prisma.$executeRaw`
      UPDATE voice_transcript_requests SET status=${status},lease_token=NULL,lease_until=NULL,
        next_attempt_at=now()+make_interval(secs=>${retrySeconds})
      WHERE media_id=${request.media_id}::uuid AND chat_type=${request.chat_type} AND lease_token=${token}::uuid`;
  }
}
