/* eslint-disable @typescript-eslint/require-await -- Promise-returning test doubles mirror storage and Prisma contracts without external I/O. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ModuleFileSnapshot } from '@prisma/client';
import { ModuleFileSnapshotService } from './module-file-snapshot.service';

function fixture() {
  let row: ModuleFileSnapshot | null = null,
    reads = 0,
    copies = 0,
    fail = false;
  const cleanupKeys: string[] = [];
  let wait = Promise.resolve();
  const source = {
    id: 'source',
    type: 'FILE',
    ownerUserId: 'someone-else',
    isArchived: false,
    s3Key: 'original/key',
    name: 'file.txt',
    mimeType: 'text/plain',
    sizeBytes: 10n,
  };
  const version = { id: 'version', s3Key: source.s3Key, sizeBytes: 10n };
  const versions = [version];
  const copiedSources: string[] = [];
  const prisma = {
    $transaction: async <T>(run: (tx: unknown) => Promise<T>) => run(prisma),
    moduleFileSnapshot: {
      findUnique: async () => (row ? { ...row } : null),
      findFirst: async ({
        where,
      }: {
        where: { id: string; actorId: string; notebookId: string };
      }) =>
        row &&
        row.id === where.id &&
        row.actorId === where.actorId &&
        row.notebookId === where.notebookId
          ? row
          : null,
      upsert: async ({ create }: { create: ModuleFileSnapshot }) => ({
        ...(row ??= {
          ...create,
          notebookId: create.notebookId ?? null,
          status: 'PREPARING',
          leaseToken: null,
          leaseUntil: null,
        }),
      }),
      updateMany: async ({
        where,
        data,
      }: {
        where: { leaseToken?: string; OR?: unknown };
        data: Partial<ModuleFileSnapshot>;
      }) => {
        if (
          !row ||
          (where.leaseToken && where.leaseToken !== row.leaseToken) ||
          (where.OR && row.leaseToken && row.leaseUntil! > new Date())
        )
          return { count: 0 };
        Object.assign(row, data);

        return { count: 1 };
      },
    },
    documentVersion: {
      findFirst: async ({ where }: { where: { s3Key?: string } }) =>
        versions.find(
          (candidate) => !where.s3Key || candidate.s3Key === where.s3Key,
        ) ?? null,
    },
  };
  const service = new ModuleFileSnapshotService(
    prisma as unknown as ConstructorParameters<
      typeof ModuleFileSnapshotService
    >[0],
    {
      copySnapshot: async (sourceKey: string) => {
        copies++;
        copiedSources.push(sourceKey);
        await wait;
        if (fail) throw new Error('Storage failed');
      },
      assertUploadSize: async () => {},
      generatePresignedDownloadUrl: async () =>
        'https://storage.invalid/private-copy',
    } as unknown as ConstructorParameters<typeof ModuleFileSnapshotService>[1],
    {
      checkPermission: async () => {
        reads++;
        if (source.isArchived) throw Error('Source deleted');

        return source;
      },
    } as unknown as ConstructorParameters<typeof ModuleFileSnapshotService>[2],
    {} as ConstructorParameters<typeof ModuleFileSnapshotService>[3],
    {
      enqueue: async (_tx: unknown, keys: string[]) => {
        cleanupKeys.push(...keys);
      },
    } as unknown as ConstructorParameters<typeof ModuleFileSnapshotService>[4],
  );

  return {
    service,
    source,
    versions,
    copiedSources,
    row: () => row!,
    copies: () => copies,
    reads: () => reads,
    cleanupKeys,
    fail: (next: boolean) => {
      fail = next;
    },
    wait: (next: Promise<void>) => {
      wait = next;
    },
  };
}
const request = {
  documentId: 'source',
  versionId: 'version',
  operationId: 'operation',
};

void test('new Chat copies resolve the selected Current version even when a newer upload exists', async () => {
  const f = fixture();
  f.versions.unshift({
    id: 'newer-upload',
    s3Key: 'newer/key',
    sizeBytes: 20n,
  });
  await f.service.copy('viewer', 'viewer@example.invalid', request, {
    scope: 'CHAT',
  });
  assert.deepEqual(f.copiedSources, ['original/key']);
  assert.equal(f.row().sourceVersionId, 'version');
});

void test('Notebook private uploads accept more than 10 MiB, enforce 20 MiB and replay without creating DocumentItems', async () => {
  let snapshot: ModuleFileSnapshot | undefined;
  const size = 15 * 1024 * 1024;
  const storage = {
    snapshotUploadUrl: async () => 'https://storage.invalid/upload',
    assertUploadSize: async (_key: string, expected: number) =>
      assert.equal(expected, size),
    describeAiSource: async () => ({ mimeType: 'application/pdf' }),
    generatePresignedDownloadUrl: async () => 'https://storage.invalid/private',
  };
  const service = new ModuleFileSnapshotService(
    {
      moduleFileSnapshot: {
        upsert: async ({ create }: { create: ModuleFileSnapshot }) =>
          (snapshot ??= create),
        findFirst: async ({
          where,
        }: {
          where: { actorId: string; notebookId: string };
        }) =>
          snapshot?.actorId === where.actorId &&
          snapshot?.notebookId === where.notebookId
            ? snapshot
            : null,
        update: async ({ data }: { data: Partial<ModuleFileSnapshot> }) =>
          Object.assign(snapshot!, data),
      },
    } as unknown as ConstructorParameters<typeof ModuleFileSnapshotService>[0],
    storage as unknown as ConstructorParameters<
      typeof ModuleFileSnapshotService
    >[1],
    {} as ConstructorParameters<typeof ModuleFileSnapshotService>[2],
    {} as ConstructorParameters<typeof ModuleFileSnapshotService>[3],
    {} as ConstructorParameters<typeof ModuleFileSnapshotService>[4],
  );
  await assert.rejects(
    service.upload(
      'owner',
      'book',
      'oversized',
      'report.pdf',
      'application/pdf',
      20 * 1024 * 1024 + 1,
    ),
    /20 MiB/,
  );
  const upload = await service.upload(
    'owner',
    'book',
    'operation',
    'report.pdf',
    'application/pdf',
    size,
  );
  assert.ok(upload.presignedUrl);
  assert.ok(
    snapshot!.s3Key.startsWith('documents/owner/module-snapshots/notebook/'),
  );
  const currentKey = snapshot!.s3Key;
  snapshot!.s3Key = `module-snapshots/notebook/${upload.snapshotId}/report.pdf`;
  await assert.rejects(
    service.upload(
      'owner',
      'book',
      'operation',
      'report.pdf',
      'application/pdf',
      size,
    ),
    /older storage location/,
  );
  snapshot!.s3Key = currentKey;
  await assert.rejects(
    service.confirmUpload('another-user', 'book', upload.snapshotId),
    /unavailable/,
  );
  const confirmed = await service.confirmUpload(
    'owner',
    'book',
    upload.snapshotId,
  );
  assert.equal(confirmed.sizeBytes, size);
  const replay = await service.upload(
    'owner',
    'book',
    'operation',
    'report.pdf',
    'application/pdf',
    size,
  );
  assert.equal(replay.snapshotId, upload.snapshotId);
  assert.equal(replay.presignedUrl, undefined);
});

void test('a readable shared file is copied once and completed retries survive original deletion', async () => {
  const f = fixture();
  const first = await f.service.copy(
    'viewer',
    'viewer@example.invalid',
    request,
    { scope: 'CHAT' },
  );
  const reads = f.reads();
  f.source.isArchived = true;
  const replay = await f.service.copy(
    'viewer',
    'viewer@example.invalid',
    request,
    { scope: 'CHAT' },
  );
  assert.equal(replay.snapshotId, first.snapshotId);
  assert.equal(f.copies(), 1);
  assert.equal(f.reads(), reads);
  assert.notEqual(f.row().s3Key, f.source.s3Key);
  assert.ok(
    f.row().s3Key.startsWith('documents/viewer/module-snapshots/chat/'),
  );
});

void test('retry relocates a failed legacy copy under the authorized Documents namespace', async () => {
  const f = fixture();
  f.fail(true);
  await assert.rejects(
    f.service.copy('viewer', 'viewer@example.invalid', request, {
      scope: 'CHAT',
    }),
  );
  const id = f.row().id;
  f.row().s3Key = `module-snapshots/chat/${id}`;
  f.fail(false);
  const retried = await f.service.copy(
    'viewer',
    'viewer@example.invalid',
    request,
    { scope: 'CHAT' },
  );
  assert.equal(retried.snapshotId, id);
  assert.equal(f.row().s3Key, `documents/viewer/module-snapshots/chat/${id}`);
  assert.equal(f.row().status, 'READY');
  assert.deepEqual(f.cleanupKeys, [`module-snapshots/chat/${id}`]);
});

void test('completed legacy copies keep their stored object key and remain independently readable', async () => {
  const f = fixture();
  const first = await f.service.copy(
    'viewer',
    'viewer@example.invalid',
    request,
    { scope: 'CHAT' },
  );
  const oldKey = `module-snapshots/chat/${first.snapshotId}`;
  f.row().s3Key = oldKey;
  f.source.isArchived = true;
  const replay = await f.service.copy(
    'viewer',
    'viewer@example.invalid',
    request,
    { scope: 'CHAT' },
  );
  assert.equal(replay.snapshotId, first.snapshotId);
  assert.equal(f.row().s3Key, oldKey);
  assert.equal(f.copies(), 1);
  assert.deepEqual(f.cleanupKeys, []);
});
void test('concurrent calls claim one lease; another target cannot reuse the operation', async () => {
  const f = fixture();
  let release!: () => void;
  f.wait(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const first = f.service.copy('viewer', 'viewer@example.invalid', request, {
    scope: 'CHAT',
  });
  while (!f.copies()) await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    f.service.copy('viewer', 'viewer@example.invalid', request, {
      scope: 'CHAT',
    }),
    /still being prepared/,
  );
  release();
  await first;
  await assert.rejects(
    f.service.copy(
      'viewer',
      'viewer@example.invalid',
      { ...request, documentId: 'different' },
      { scope: 'CHAT' },
    ),
    /another selection/,
  );
  assert.equal(f.copies(), 1);
});
void test('Notebook copies enforce owner/notebook scope and do not recheck the original', async () => {
  const f = fixture();
  const copy = await f.service.copy('owner', 'owner@example.invalid', request, {
    scope: 'NOTEBOOK',
    notebookId: 'notebook',
  });
  f.source.isArchived = true;
  const copies = await f.service.resolve(
    'owner',
    'notebook',
    [copy.snapshotId],
    true,
    true,
  );
  assert.equal(copies[0].versionId, 'version');
  assert.equal(f.row().expiresAt, null);
  await assert.rejects(
    f.service.resolve('other-user', 'notebook', [copy.snapshotId], true),
  );
  await assert.rejects(
    f.service.resolve('owner', 'other-notebook', [copy.snapshotId], true),
  );
});
void test('failed storage remains retryable; changed source versions are rejected', async () => {
  const f = fixture();
  f.fail(true);
  await assert.rejects(
    f.service.copy('owner', 'owner@example.invalid', request, {
      scope: 'CHAT',
    }),
    /Storage failed/,
  );
  assert.equal(f.row().status, 'FAILED');
  f.fail(false);
  await f.service.copy('owner', 'owner@example.invalid', request, {
    scope: 'CHAT',
  });
  const other = fixture();
  await assert.rejects(
    other.service.copy(
      'owner',
      'owner@example.invalid',
      { ...request, versionId: 'old-version' },
      { scope: 'CHAT' },
    ),
    /changed/,
  );
});
void test('AI can recover a committed Notebook copy after an interrupted retain call without consulting the original', async () => {
  const f = fixture();
  const copy = await f.service.copy('owner', 'owner@example.invalid', request, {
    scope: 'NOTEBOOK',
    notebookId: 'notebook',
  });
  f.row().expiresAt = new Date(0);
  f.source.isArchived = true;
  await assert.rejects(
    f.service.resolve('owner', 'notebook', [copy.snapshotId], false),
  );
  const recovered = await f.service.resolve(
    'owner',
    'notebook',
    [copy.snapshotId],
    false,
    true,
  );
  assert.equal(recovered[0].snapshotId, copy.snapshotId);
  assert.equal(f.row().expiresAt, null);
});
