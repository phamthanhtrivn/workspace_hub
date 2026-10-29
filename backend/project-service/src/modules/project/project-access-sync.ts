import { Prisma } from '@prisma/client';

export const AccessSyncStatus = { PENDING: 'PENDING', READY: 'READY', FAILED: 'FAILED', NOT_CREATED: 'NOT_CREATED' } as const;
export const ACCESS_SYNC_INTERVAL_MS = 3_000;
export const ACCESS_SYNC_MAX_BACKOFF_MS = 300_000;

export async function enqueueProjectAccessSync(tx: Prisma.TransactionClient, projectId: string) {
  return tx.projectAccessSyncJob.upsert({ where: { projectId },
    create: { projectId },
    update: { revision: { increment: 1 }, documentStatus: AccessSyncStatus.PENDING,
      chatStatus: AccessSyncStatus.PENDING, attemptCount: 0, nextAttemptAt: new Date(), lastError: null },
  });
}
