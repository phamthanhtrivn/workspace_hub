import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ItemType, LinkAccess, SharePermission } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { S3Service } from '../../infrastructure/s3/s3.service';
import { DocumentAccessService } from './document-access.service';
import type { DocumentEventPublisher } from './document-event-publisher.service';
import { StorageCleanupService } from './storage-cleanup.service';
import { DocumentVersionDeletionService } from './document-version-deletion.service';
import { DocumentContentService } from './document-content.service';
import type { Request, Response } from 'express';

function setup() {
  const document = {
    id: 'file',
    name: 'Report.pdf',
    type: ItemType.FILE as ItemType,
    ownerUserId: 'owner',
    ownerEmail: 'owner@example.com',
    projectId: null,
    parentFolderId: null,
    isArchived: false,
    isStarred: false,
    s3Key: 'current-key',
    sizeBytes: 20n,
    linkAccess: LinkAccess.VIEWER,
    shareExpiresAt: null,
    shares: [
      {
        shareWithUserId: 'editor',
        shareWithEmail: 'editor@example.com',
        permission: SharePermission.EDITOR,
      },
      {
        shareWithUserId: 'viewer',
        shareWithEmail: 'viewer@example.com',
        permission: SharePermission.VIEWER,
      },
    ],
  };
  const history = [
    {
      id: 'v1',
      documentItemId: 'file',
      s3Key: 'old-key',
      sizeBytes: 10n,
      uploadedBy: 'editor',
    },
    {
      id: 'v2',
      documentItemId: 'file',
      s3Key: 'current-key',
      sizeBytes: 20n,
      uploadedBy: 'owner',
    },
  ];
  const jobs: string[] = [],
    calls: string[] = [];
  let usedBytes = 30n,
    failCleanup = false;
  let onLock = () => {};
  const tx = {
    $queryRaw: () => {
      calls.push('lock');
      onLock();

      return Promise.resolve([]);
    },
    $executeRaw: (_sql: TemplateStringsArray, bytes: bigint, owner: string) => {
      assert.equal(owner, document.ownerUserId);
      calls.push('quota');
      usedBytes -= bytes;

      return Promise.resolve(1);
    },
    documentItem: { findUniqueOrThrow: () => Promise.resolve(document) },
    documentVersion: {
      findUnique: ({
        where,
      }: {
        where: { id: string; documentItemId: string };
      }) =>
        Promise.resolve(
          history.find(
            (version) =>
              version.id === where.id &&
              version.documentItemId === where.documentItemId,
          ) ?? null,
        ),
      count: () =>
        Promise.resolve(
          history.filter((version) => version.documentItemId === document.id)
            .length,
        ),
      delete: ({ where }: { where: { id: string } }) => {
        calls.push('delete');
        const index = history.findIndex((version) => version.id === where.id);

        return Promise.resolve(history.splice(index, 1)[0]);
      },
    },
    storageCleanupJob: {
      upsert: ({ create }: { create: { s3Key: string } }) => {
        calls.push('cleanup');
        if (failCleanup) return Promise.reject(new Error('Queue unavailable'));
        jobs.push(create.s3Key);

        return Promise.resolve(create);
      },
    },
  };
  const prisma = {
    ...tx,
    documentItem: {
      ...tx.documentItem,
      findUnique: () => Promise.resolve(document),
    },
    $transaction: async (
      operation: (transaction: typeof tx) => Promise<unknown>,
    ) => {
      const snapshot = structuredClone(history),
        previousBytes = usedBytes,
        previousJobs = [...jobs];
      try {
        return await operation(tx);
      } catch (error) {
        history.splice(0, history.length, ...snapshot);
        usedBytes = previousBytes;
        jobs.splice(0, jobs.length, ...previousJobs);
        throw error;
      }
    },
  } as unknown as PrismaService;
  const events = {
    publishProjectDocumentEvent: () => {
      calls.push('event');

      return Promise.resolve();
    },
  } as unknown as DocumentEventPublisher;
  const service = new DocumentVersionDeletionService(
    prisma,
    new DocumentAccessService(prisma),
    new StorageCleanupService(prisma, {} as S3Service),
    events,
  );

  return {
    service,
    prisma,
    document,
    history,
    calls,
    jobs,
    used: () => usedBytes,
    failCleanup: () => {
      failCleanup = true;
    },
    onLock: (callback: () => void) => {
      onLock = callback;
    },
  };
}

void test('Owner can permanently delete an old v1 uploaded by an Editor without changing Current or Trash', async () => {
  const fixture = setup();
  const result = await fixture.service.deleteVersion(
    'file',
    'v1',
    'owner',
    'owner@example.com',
  );
  assert.deepEqual(result, { id: 'v1', documentItemId: 'file' });
  assert.deepEqual(
    fixture.history.map((version) => version.id),
    ['v2'],
  );
  assert.equal(fixture.document.s3Key, 'current-key');
  assert.equal(fixture.document.isArchived, false);
  assert.equal(fixture.used(), 20n);
  assert.deepEqual(fixture.jobs, ['old-key']);
  assert.deepEqual(fixture.calls, [
    'lock',
    'delete',
    'quota',
    'cleanup',
    'event',
  ]);
});

void test('Editor, Viewer and anonymous shared-link users cannot delete any version', async () => {
  for (const user of ['editor', 'viewer', undefined]) {
    const fixture = setup();
    await assert.rejects(
      fixture.service.deleteVersion(
        'file',
        'v1',
        user,
        user ? `${user}@example.com` : undefined,
      ),
      ForbiddenException,
    );
    assert.deepEqual(fixture.calls, []);
    assert.equal(fixture.history.length, 2);
  }
});

void test('Current and the last remaining version are protected by the backend', async () => {
  const fixture = setup();
  await assert.rejects(
    fixture.service.deleteVersion('file', 'v2', 'owner'),
    /Choose another current version/,
  );
  fixture.history.splice(0, 1);
  // Protect even a legacy final record whose key differs from the active file.
  fixture.document.s3Key = 'legacy-current';
  await assert.rejects(
    fixture.service.deleteVersion('file', 'v2', 'owner'),
    /last remaining version/,
  );
  assert.equal(fixture.used(), 30n);
  assert.ok(!fixture.calls.includes('delete'));
});

void test('cross-document version IDs and unavailable documents cannot be deleted', async () => {
  const fixture = setup();
  fixture.history[0].documentItemId = 'another-file';
  await assert.rejects(
    fixture.service.deleteVersion('file', 'v1', 'owner'),
    NotFoundException,
  );
  for (const patch of [
    { type: ItemType.FOLDER },
    { isArchived: true },
    { isStarred: true },
  ]) {
    const blocked = setup();
    Object.assign(blocked.document, patch);
    await assert.rejects(
      blocked.service.deleteVersion('file', 'v1', 'owner'),
      BadRequestException,
    );
    assert.ok(!blocked.calls.includes('delete'));
  }
});

void test('failed cleanup enqueue rolls back the removed version and quota and publishes no update', async () => {
  const fixture = setup();
  fixture.failCleanup();
  await assert.rejects(
    fixture.service.deleteVersion('file', 'v1', 'owner'),
    /Queue unavailable/,
  );
  assert.equal(fixture.history.length, 2);
  assert.equal(fixture.used(), 30n);
  assert.deepEqual(fixture.jobs, []);
  assert.ok(!fixture.calls.includes('event'));
});

void test('Current is checked from the locked document after a concurrent selection', async () => {
  const fixture = setup();
  fixture.onLock(() => {
    fixture.document.s3Key = 'old-key';
  });
  await assert.rejects(
    fixture.service.deleteVersion('file', 'v1', 'owner'),
    /Choose another current version/,
  );
  assert.ok(!fixture.calls.includes('delete'));
});

void test('an already issued preview link cannot read a permanently deleted version', async (context) => {
  const previous = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY =
    'version-deletion-test-signing-secret-at-least-32-bytes';
  context.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = previous;
  });
  const fixture = setup();
  let reads = 0;
  const content = new DocumentContentService(
    fixture.prisma,
    new DocumentAccessService(fixture.prisma),
    {
      readAuthorizedContent: () => {
        reads++;

        return Promise.resolve({ ContentLength: 10 });
      },
    } as unknown as S3Service,
  );
  const url = await content.issue('file', false, 'v1');
  const ticket = new URL(url, 'https://api.example.test').searchParams.get(
    'ticket',
  )!;
  await fixture.service.deleteVersion('file', 'v1', 'owner');
  await assert.rejects(
    content.stream(
      ticket,
      { method: 'HEAD', headers: {} } as Request,
      {} as Response,
    ),
    NotFoundException,
  );
  assert.equal(reads, 0);
});
