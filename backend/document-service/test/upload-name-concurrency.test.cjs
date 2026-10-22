const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const {
  DocumentService,
} = require('../dist/modules/document/document.service');
const { ConflictException } = require('@nestjs/common');
const {
  GlobalExceptionFilter,
} = require('../dist/common/filters/global-exception.filter');

test('name conflicts preserve a machine-readable code for bounded upload retries', () => {
  let body;
  const response = {
    status(status) {
      assert.equal(status, 409);
      return this;
    },
    json(value) {
      body = value;
    },
  };
  new GlobalExceptionFilter().catch(
    new ConflictException({
      message: 'Duplicate name',
      code: 'DOCUMENT_NAME_CONFLICT',
    }),
    {
      switchToHttp: () => ({ getResponse: () => response }),
    },
  );
  assert.equal(body.code, 'DOCUMENT_NAME_CONFLICT');
  assert.equal(body.message, 'Duplicate name');
});

test(
  'concurrent upload confirmations and folder creation cannot commit the same sibling name',
  {
    skip: process.env.TEST_DOCUMENT_POSTGRES !== 'true',
  },
  async () => {
    require('dotenv').config({ quiet: true });
    const databaseUrl = new URL(process.env.DATABASE_URL);
    if (databaseUrl.hostname === 'localhost')
      databaseUrl.hostname = '127.0.0.1';
    databaseUrl.searchParams.set('connection_limit', '4');
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl.toString() } },
    });
    const userId = randomUUID();
    const service = new DocumentService(
      prisma,
      {
        checkQuota: async () => {},
        updateUsedBytes: async () => {},
      },
      {},
      {},
      {},
    );
    service.enrichDocumentItem = async (item) => item;
    service.publishProjectDocumentEvent = async () => {};
    try {
      for (const kind of ['folder', 'file', 'mixed']) {
        const results = await Promise.allSettled(
          Array.from({ length: 8 }, (_, index) => {
            const name = index % 2 ? `${kind}.DOCX` : `${kind}.docx`;
            if (kind === 'folder' || (kind === 'mixed' && index % 2))
              return service.createFolder(userId, 'fixture@example.test', {
                name,
              });
            return service.confirmUpload(userId, 'fixture@example.test', {
              name,
              sizeBytes: 1,
              mimeType: 'text/plain',
              s3Key: `test-only/${userId}/${index}`,
            });
          }),
        );
        assert.equal(
          results.filter((r) => r.status === 'fulfilled').length,
          1,
          `${kind}: ${results.find((r) => r.status === 'rejected')?.reason?.message ?? ''}`,
        );
        for (const result of results.filter((r) => r.status === 'rejected'))
          assert.equal(
            result.reason.getStatus?.(),
            409,
            `${kind}: ${result.reason.message}`,
          );
        assert.equal(
          await prisma.documentItem.count({
            where: {
              ownerUserId: userId,
              name: { equals: `${kind}.docx`, mode: 'insensitive' },
            },
          }),
          1,
        );
      }
    } finally {
      const items = await prisma.documentItem.findMany({
        where: { ownerUserId: userId },
        select: { id: true },
      });
      await prisma.documentVersion.deleteMany({
        where: { documentItemId: { in: items.map((item) => item.id) } },
      });
      await prisma.documentItem.deleteMany({ where: { ownerUserId: userId } });
      await prisma.$disconnect();
    }
  },
);
