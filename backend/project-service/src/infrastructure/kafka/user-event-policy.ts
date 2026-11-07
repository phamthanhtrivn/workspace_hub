import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';

export class InvalidUserEvent extends BadRequestException {}
export interface UserEventEnvelope {
  userId: string;
  eventId?: string;
  schemaVersion?: number;
  revision?: string;
  occurredAt?: string | null;
}
export function parseUserEvent(payload: UserEventEnvelope): { revision: bigint; occurredAt: Date } {
  if (!payload || !isUUID(payload.userId) || typeof payload.occurredAt !== 'string' || !Number.isFinite(Date.parse(payload.occurredAt)))
    throw new InvalidUserEvent('Invalid user event identity or timestamp');
  if ((payload.schemaVersion !== undefined || payload.eventId !== undefined || payload.revision !== undefined) && (payload.schemaVersion !== 1 || typeof payload.revision !== 'string' || !isUUID(payload.eventId) || !/^[1-9][0-9]{0,18}$/.test(payload.revision)))
    throw new InvalidUserEvent('Invalid user event envelope');
  const revision = payload.revision === undefined ? 0n : BigInt(payload.revision);
  if (revision > 9223372036854775807n) throw new InvalidUserEvent('Invalid user event revision');
  return { revision, occurredAt: new Date(payload.occurredAt) };
}
export async function claimUserEvent(tx: Prisma.TransactionClient, topic: string, payload: UserEventEnvelope): Promise<boolean> {
  const { revision, occurredAt } = parseUserEvent(payload);
  const claimed = await tx.$queryRaw<Array<{ user_id: string }>>`
    INSERT INTO user_event_cursors (topic, user_id, revision, occurred_at)
    VALUES (${topic}, ${payload.userId}::uuid, ${revision}, ${occurredAt})
    ON CONFLICT (topic, user_id) DO UPDATE
    SET revision = EXCLUDED.revision, occurred_at = EXCLUDED.occurred_at
    WHERE EXCLUDED.revision > user_event_cursors.revision
      OR (EXCLUDED.revision = 0 AND user_event_cursors.revision = 0
          AND EXCLUDED.occurred_at > user_event_cursors.occurred_at)
    RETURNING user_id
  `;
  return claimed.length > 0;
}
