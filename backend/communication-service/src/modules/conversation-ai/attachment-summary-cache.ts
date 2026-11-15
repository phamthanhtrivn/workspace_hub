import { BadRequestException, ConflictException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { CONVERSATION_AI_MESSAGES } from './conversation-ai.messages';

export interface AttachmentSummaryOptions {
  regenerate?: boolean;
  actionId?: string;
}
export interface AttachmentSummaryReceipt {
  reused: boolean;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  reply?: { id: string; content: string };
}

export function parseAttachmentSummaryOptions(
  value: unknown,
): AttachmentSummaryOptions | undefined {
  if (value === undefined) return undefined;
  const options = value as AttachmentSummaryOptions;
  if (
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (key) => key !== 'regenerate' && key !== 'actionId',
    ) ||
    (options.regenerate !== undefined &&
      typeof options.regenerate !== 'boolean') ||
    (options.actionId !== undefined &&
      (typeof options.actionId !== 'string' || !isUUID(options.actionId))) ||
    (options.regenerate && !options.actionId)
  ) {
    throw new BadRequestException(
      CONVERSATION_AI_MESSAGES.invalidSummaryRequest,
    );
  }

  return options;
}

export async function reserveAttachmentSummary(
  tx: Prisma.TransactionClient,
  identity: readonly unknown[],
  options: AttachmentSummaryOptions = {},
) {
  parseAttachmentSummaryOptions(options);
  const key = createHash('sha256')
    .update(JSON.stringify(['attachment-summary-v1', ...identity]))
    .digest('hex');
  if (options.actionId)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${options.actionId},8087011))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},8087010))`;
  const previous = options.actionId
    ? await tx.$queryRaw<
        {
          id: string;
          status: AttachmentSummaryReceipt['status'];
          summary_key: string;
        }[]
      >`
    SELECT id,status,summary_key FROM conversation_ai_requests WHERE summary_action_id=${options.actionId}::uuid`
    : [];
  if (previous[0] && previous[0].summary_key !== key)
    throw new ConflictException(CONVERSATION_AI_MESSAGES.summaryActionConflict);
  const candidates = previous.length
    ? previous
    : await tx.$queryRaw<
        {
          id: string;
          status: AttachmentSummaryReceipt['status'];
          summary_key: string;
        }[]
      >`
    SELECT id,status,summary_key FROM conversation_ai_requests
    WHERE summary_key=${key} AND status IN ('QUEUED','RUNNING','COMPLETED')
    ORDER BY created_at DESC,id DESC LIMIT 1`;
  const candidate = candidates[0];

  return {
    key,
    replayed: previous.length > 0,
    existing:
      candidate &&
      (previous.length ||
        !options.regenerate ||
        candidate.status !== 'COMPLETED')
        ? candidate
        : undefined,
  };
}

export async function reuseAttachmentSummary(
  tx: Prisma.TransactionClient,
  identity: readonly unknown[],
  chatType: 'CHANNEL' | 'DIRECT_MESSAGE',
  options: AttachmentSummaryOptions | undefined,
  replyId: (requestId: string) => string,
) {
  const reservation = await reserveAttachmentSummary(tx, identity, options);
  const candidate = reservation.existing;
  if (candidate) {
    const original =
      chatType === 'CHANNEL'
        ? await tx.message.findUnique({
            where: { id: candidate.id },
            include: { medias: true },
          })
        : await tx.directMessage.findUnique({
            where: { id: candidate.id },
            include: { medias: true },
          });
    const reply =
      candidate.status === 'COMPLETED'
        ? chatType === 'CHANNEL'
          ? await tx.message.findUnique({
              where: { id: replyId(candidate.id) },
            })
          : await tx.directMessage.findUnique({
              where: { id: replyId(candidate.id) },
            })
        : undefined;
    if (
      original &&
      !original.deletedAt &&
      !original.recalled &&
      (candidate.status !== 'COMPLETED' ||
        (reply && !reply.deletedAt && !reply.recalled))
    ) {
      const summary: AttachmentSummaryReceipt = {
        reused: true,
        status: candidate.status,
        ...(reply
          ? { reply: { id: reply.id, content: reply.content ?? '' } }
          : {}),
      };

      return { key: reservation.key, reused: { ...original, summary } };
    }
    if (reservation.replayed)
      throw new ConflictException(
        CONVERSATION_AI_MESSAGES.summaryNoLongerAvailable,
      );
  }

  return { key: reservation.key, reused: undefined };
}
