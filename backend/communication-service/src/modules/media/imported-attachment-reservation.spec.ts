/* eslint-disable @typescript-eslint/require-await -- Promise-returning test doubles mirror storage and Prisma contracts without external I/O. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import { reserveImportedAttachments } from './imported-attachment-reservation';
const id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  chat = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const attachment = {
  name: 'copy.txt',
  mimeType: 'text/plain',
  sizeBytes: 5,
  s3Key: `chat-media/${chat}/copy_${id}_0`,
};
void test('publication reserves the READY copy for its owner and destination in the message transaction', async () => {
  let checked: unknown;
  const tx = {
    documentAttachmentImport: {
      updateMany: async (query: unknown) => {
        checked = query;

        return { count: 1 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  await reserveImportedAttachments(tx, 'actor', chat, 'MEETING', [attachment]);
  assert.deepEqual((checked as { where: unknown }).where, {
    id,
    actorId: 'actor',
    chatId: chat,
    chatType: 'MEETING',
    status: 'READY',
  });
});
void test('expired copies cannot be published, while ordinary device uploads do not require a copy receipt', async () => {
  const tx = {
    documentAttachmentImport: { updateMany: async () => ({ count: 0 }) },
  } as unknown as Prisma.TransactionClient;
  await assert.rejects(
    reserveImportedAttachments(tx, 'actor', chat, 'CHANNEL', [attachment]),
    /expired/,
  );
  await reserveImportedAttachments(
    {} as Prisma.TransactionClient,
    'actor',
    chat,
    'CHANNEL',
    [{ ...attachment, s3Key: `chat-media/${chat}/device-upload` }],
  );
});
