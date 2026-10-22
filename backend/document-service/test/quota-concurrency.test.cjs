const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { PrismaClient } = require('@prisma/client');
const { QuotaService } = require('../dist/modules/quota/quota.service');

const postgresEnabled = process.env.TEST_QUOTA_POSTGRES === 'true';

test(
  'concurrent first requests share one default quota',
  {
    skip: !postgresEnabled,
  },
  async () => {
    const prisma = new PrismaClient();
    const userId = randomUUID();
    const concurrency = 20;
    let arrived = 0;
    let release;
    const allReadMissing = new Promise((resolve) => {
      release = resolve;
    });
    const service = new QuotaService({
      userStorageQuota: {
        async findUnique(args) {
          const quota = await prisma.userStorageQuota.findUnique(args);
          assert.equal(quota, null);
          arrived += 1;
          if (arrived === concurrency) release();
          await allReadMissing;
          return quota;
        },
        create: (args) => prisma.userStorageQuota.create(args),
        createMany: (args) => prisma.userStorageQuota.createMany(args),
        findUniqueOrThrow: (args) =>
          prisma.userStorageQuota.findUniqueOrThrow(args),
      },
    });
    try {
      const results = await Promise.allSettled(
        Array.from({ length: concurrency }, () =>
          service.getOrCreateQuota(userId),
        ),
      );
      assert.equal(
        results.filter((result) => result.status === 'fulfilled').length,
        concurrency,
      );
      assert.equal(
        await prisma.userStorageQuota.count({ where: { userId } }),
        1,
      );
      for (const result of results) {
        assert.equal(result.value.userId, userId);
        assert.equal(result.value.maxBytes, 5n * 1024n ** 3n);
        assert.equal(result.value.usedBytes, 0n);
      }
    } finally {
      await prisma.userStorageQuota.deleteMany({ where: { userId } });
      await prisma.$disconnect();
    }
  },
);

test(
  'reading an existing quota preserves usage and custom capacity',
  {
    skip: !postgresEnabled,
  },
  async () => {
    const prisma = new PrismaClient();
    const userId = randomUUID();
    try {
      const original = await prisma.userStorageQuota.create({
        data: { userId, maxBytes: 999999n, usedBytes: 12345n },
      });
      const service = new QuotaService(prisma);
      const results = await Promise.all(
        Array.from({ length: 20 }, () => service.getOrCreateQuota(userId)),
      );
      for (const quota of results) assert.deepEqual(quota, original);
    } finally {
      await prisma.userStorageQuota.deleteMany({ where: { userId } });
      await prisma.$disconnect();
    }
  },
);

test('quota initialization propagates unrelated database failures', async () => {
  const failure = new Error('database unavailable');
  const service = new QuotaService({
    userStorageQuota: {
      findUnique: async () => null,
      create: async () => {
        throw failure;
      },
      createMany: async () => {
        throw failure;
      },
    },
  });
  await assert.rejects(
    service.getOrCreateQuota(randomUUID()),
    (error) => error === failure,
  );
});
