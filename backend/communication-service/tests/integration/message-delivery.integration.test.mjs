import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readEnvironment } from '../../../scripts/local-security/env-files.mjs';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const {
  reserveMessageDelivery,
  recordMessageDelivery,
} = require('../../src/common/utils/message-delivery.ts');

for (const chatType of ['CHANNEL', 'DIRECT_MESSAGE', 'MEETING']) {
  test(
    `Prisma ${chatType} delivery acquires the PostgreSQL lock and replays a receipt without writing application data`,
    {
      skip: process.env.WORKSPACEHUB_MESSAGE_DELIVERY_DB_TESTS !== '1',
    },
    async () => {
      const env = {
        ...readEnvironment('backend/communication-service/.env').values,
        ...readEnvironment('backend/communication-service/.env.local').values,
      };
      const url = new URL(env.DATABASE_URL);
      assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
      assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
      const prisma = new PrismaClient({
        datasources: { db: { url: url.toString() } },
      });
      const identity = {
        senderId: randomUUID(),
        requestId: randomUUID(),
        chatId: randomUUID(),
        chatType,
        payload: { content: '', medias: [{ s3Key: 'synthetic-copy' }] },
      };
      const messageId = randomUUID();
      try {
        await prisma.$transaction(async (tx) => {
          // This session-local table shadows the real receipt table and drops at commit/rollback.
          await tx.$executeRaw`CREATE TEMP TABLE message_delivery_receipts (
        sender_id text NOT NULL, request_id uuid NOT NULL, fingerprint text NOT NULL,
        message_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(sender_id,request_id)
      ) ON COMMIT DROP`;
          assert.equal(await reserveMessageDelivery(tx, identity), undefined);
          await recordMessageDelivery(tx, identity, messageId);
          assert.equal(await reserveMessageDelivery(tx, identity), messageId);
          await assert.rejects(
            reserveMessageDelivery(tx, { ...identity, chatId: randomUUID() }),
            /already used/,
          );
          const [receipt] =
            await tx.$queryRaw`SELECT count(*)::int AS count FROM message_delivery_receipts`;
          assert.equal(receipt.count, 1);
          const [locks] =
            await tx.$queryRaw`SELECT count(*)::int AS count FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND granted`;
          assert.equal(locks.count, 1);
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  );
}
