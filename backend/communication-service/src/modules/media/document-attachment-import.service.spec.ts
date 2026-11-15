/* eslint-disable @typescript-eslint/require-await -- Promise-returning test doubles mirror storage and Prisma contracts without external I/O. */
import 'reflect-metadata';
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { DocumentAttachmentImport } from '@prisma/client';
import { DocumentAttachmentImportService } from './document-attachment-import.service';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
function fixture(context: TestContext) {
  const original = process.env.DOCUMENT_SERVICE_URL;
  process.env.DOCUMENT_SERVICE_URL = 'http://document.invalid';
  context.after(() => {
    if (original === undefined) delete process.env.DOCUMENT_SERVICE_URL;
    else process.env.DOCUMENT_SERVICE_URL = original;
  });
  let record: DocumentAttachmentImport | undefined,
    copied = 0,
    exports = 0,
    allowed = true;
  const stored = new Set<string>();
  context.mock.method(globalThis, 'fetch', async (url: unknown) => {
    if (String(url).endsWith('/api/documents/exports')) {
      exports++;

      return Response.json({
        data: {
          name: 'file.txt',
          mimeType: 'text/plain',
          sizeBytes: 5,
          downloadUrl: 'https://storage.invalid/copy',
        },
      });
    }

    return new Response('hello');
  });
  const prisma = {
    documentAttachmentImport: {
      upsert: async ({ create }: { create: DocumentAttachmentImport }) =>
        (record ??= {
          ...create,
          id: 'receipt',
          status: 'PREPARING',
          result: null,
          leaseToken: null,
          leaseUntil: null,
        }),
      updateMany: async ({
        where,
        data,
      }: {
        where: { leaseToken?: string; OR?: unknown };
        data: Partial<DocumentAttachmentImport>;
      }) => {
        if (
          !record ||
          (where.leaseToken && where.leaseToken !== record.leaseToken) ||
          (where.OR && record.leaseToken && record.leaseUntil! > new Date())
        )
          return { count: 0 };
        Object.assign(record, data);

        return { count: 1 };
      },
    },
  };
  const service = new DocumentAttachmentImportService(
    prisma as unknown as ConstructorParameters<
      typeof DocumentAttachmentImportService
    >[0],
    {
      assertCanUpload: async () => {
        if (!allowed) throw new ForbiddenException('Destination access denied');
      },
    } as unknown as ConstructorParameters<
      typeof DocumentAttachmentImportService
    >[1],
    {
      putImportedAttachment: async (key: string) => {
        copied++;
        stored.add(key);
      },
      assertAttachments: async (files: { s3Key: string }[]) => {
        if (files.some((file) => !stored.has(file.s3Key)))
          throw new BadRequestException('Missing object');
      },
    } as unknown as ConstructorParameters<
      typeof DocumentAttachmentImportService
    >[2],
  );

  return {
    service,
    copied: () => copied,
    exports: () => exports,
    deny: () => {
      allowed = false;
    },
  };
}
const request = {
  operationId: 'operation',
  chatId: 'chat',
  chatType: CHAT_CONTEXT_TYPE.CHANNEL,
  refs: [{ documentId: 'document', versionId: 'version' }],
};
void test('attachment replay returns its durable copy without downloading the source again', async (context) => {
  const f = fixture(context);
  const first = await f.service.import('actor', 'Bearer fixture', request);
  const replay = await f.service.import('actor', 'Bearer fixture', request);
  assert.deepEqual(replay.data, first.data);
  assert.equal(f.copied(), 1);
  assert.equal(f.exports(), 1);
});
void test('replay rechecks destination access and operation IDs cannot be rebound to another payload', async (context) => {
  const f = fixture(context);
  await f.service.import('actor', 'Bearer fixture', request);
  await assert.rejects(
    f.service.import('actor', 'Bearer fixture', {
      ...request,
      chatId: 'another-chat',
    }),
    /another file selection/,
  );
  f.deny();
  await assert.rejects(
    f.service.import('actor', 'Bearer fixture', request),
    /Destination access denied/,
  );
  assert.equal(f.copied(), 1);
});
