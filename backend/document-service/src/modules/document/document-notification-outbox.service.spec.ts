import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaService } from '../../prisma/prisma.service';
import { DocumentNotificationOutboxService } from './document-notification-outbox.service';

function fixture(fail: boolean) {
  const statements: string[] = [];
  const sent: unknown[] = [];
  const prisma = {
    $queryRaw: () =>
      Promise.resolve([
        {
          id: 'delivery',
          attempts: 0,
          payload: {
            recipientId: 'recipient',
            metadata: { deliveryId: 'delivery' },
          },
        },
      ]),
    $executeRaw: (sql: TemplateStringsArray) => {
      statements.push(sql.join('?'));

      return Promise.resolve(1);
    },
  } as unknown as PrismaService;
  const service = new DocumentNotificationOutboxService(prisma);
  Object.assign(service, {
    producer: {
      connect: () => Promise.resolve(),
      send: (message: unknown) => {
        if (fail)
          return Promise.reject(new Error('Temporary provider failure'));
        sent.push(message);

        return Promise.resolve();
      },
    },
  });

  return { service, statements, sent };
}
void test('successful document delivery sends the durable payload and deletes only its claimed job', async () => {
  const f = fixture(false);
  await f.service.drain();
  assert.equal(f.sent.length, 1);
  assert.ok(
    f.statements.some(
      (sql) => sql.includes('DELETE') && sql.includes('lease_token'),
    ),
  );
});
void test('provider failure preserves the notification and schedules a retry with its lease token', async () => {
  const f = fixture(true);
  await f.service.drain();
  assert.equal(f.sent.length, 0);
  assert.ok(
    f.statements.some(
      (sql) =>
        sql.includes('attempts = attempts + 1') &&
        sql.includes('next_attempt_at') &&
        sql.includes('lease_token'),
    ),
  );
  assert.equal(
    f.statements.some((sql) => sql.includes('DELETE')),
    false,
  );
});
