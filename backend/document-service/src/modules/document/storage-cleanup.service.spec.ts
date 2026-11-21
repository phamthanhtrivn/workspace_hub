/* eslint-disable @typescript-eslint/require-await -- Test doubles implement persistence async contracts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaService } from '../../prisma/prisma.service';
import type { S3Service } from '../../infrastructure/s3/s3.service';
import { StorageCleanupService } from './storage-cleanup.service';

function setup(attemptCount = 0, references = [0, 0], failure?: Error) {
  const removed: unknown[] = [];
  const updates: Array<{
    where: { id: string };
    data: { attemptCount: { increment: number }; nextAttemptAt: Date };
  }> = [];
  let deletedObjects = 0;
  const prisma = {
    storageCleanupJob: {
      findMany: async () => [{ id: 'job', s3Key: 'test-only', attemptCount }],
      deleteMany: async (input: unknown) => removed.push(input),
      update: async (input: (typeof updates)[number]) => updates.push(input),
    },
    documentItem: { count: async () => references[0] },
    documentVersion: { count: async () => references[1] },
  } as unknown as PrismaService;
  const storage = {
    deleteFile: async () => {
      deletedObjects++;
      if (failure) throw failure;
    },
  } as unknown as S3Service;
  const service = new StorageCleanupService(prisma, storage);
  (service as unknown as { logger: { warn: () => void } }).logger.warn =
    () => {};

  return { service, removed, updates, deletedObjects: () => deletedObjects };
}

void test('completed storage cleanup removes the job without scheduling another retry', async () => {
  const f = setup();
  await f.service.drain();
  assert.equal(f.deletedObjects(), 1);
  assert.deepEqual(f.removed, [{ where: { id: 'job' } }]);
  assert.deepEqual(f.updates, []);
});

void test('cleanup preserves bytes still referenced by a document or a version', async () => {
  for (const references of [
    [1, 0],
    [0, 1],
  ]) {
    const f = setup(0, references);
    await f.service.drain();
    assert.equal(f.deletedObjects(), 0);
    assert.equal(f.removed.length, 1);
  }
});

void test('failed cleanup is retained and retries back off from one minute up to one hour', async () => {
  for (const [attempt, delay] of [
    [0, 60_000],
    [1, 120_000],
    [2, 240_000],
    [6, 3_600_000],
    [168, 3_600_000],
  ]) {
    const f = setup(attempt, [0, 0], new Error('Storage unavailable'));
    const before = Date.now();
    await f.service.drain();
    const after = Date.now();
    assert.deepEqual(f.removed, []);
    assert.equal(f.updates.length, 1);
    assert.equal(f.updates[0].data.attemptCount.increment, 1);
    const next = f.updates[0].data.nextAttemptAt.getTime();
    assert.ok(next >= before + delay && next <= after + delay);
  }
});
