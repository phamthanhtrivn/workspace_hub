const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const {
  NotebookBridgeController,
} = require('../dist/modules/notebook-bridge/notebook-bridge.module');
const key = 'fixture-internal-key-not-production-000';

test('internal bridge validates the service key and still authorizes each document version', async (t) => {
  const oldKey = process.env.AI_DOCUMENT_SERVICE_KEY;
  const oldMode = process.env.NODE_ENV;
  t.after(() => {
    if (oldKey === undefined) delete process.env.AI_DOCUMENT_SERVICE_KEY;
    else process.env.AI_DOCUMENT_SERVICE_KEY = oldKey;
    if (oldMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldMode;
  });
  process.env.AI_DOCUMENT_SERVICE_KEY = key;
  process.env.NODE_ENV = 'test';
  const owner = randomUUID();
  const documentId = randomUUID();
  const versionId = randomUUID();
  const refs = [{ documentId }];
  const item = {
    id: documentId,
    type: 'FILE',
    ownerUserId: owner,
    isArchived: false,
    name: 'file.md',
    shares: [],
    linkAccess: 'VIEWER',
    versions: [{ id: versionId, s3Key: 'fixture-key', sizeBytes: 12n }],
  };
  let downloads = 0;
  const controller = new NotebookBridgeController(
    { documentItem: { findUnique: async () => item } },
    {
      generatePresignedDownloadUrl: async () => {
        downloads++;
        return 'https://storage.invalid/file';
      },
    },
  );
  const body = {
    userId: owner,
    userEmail: 'owner@example.test',
    refs,
    download: false,
  };
  await assert.rejects(
    controller.resolve('', body),
    (e) => e.getStatus() === 401,
  );
  await assert.rejects(
    controller.resolve('wrong-key', body),
    (e) => e.getStatus() === 401,
  );
  assert.equal(
    (await controller.resolve(key, body)).data[0].versionId,
    versionId,
  );
  assert.equal(downloads, 0);
  await controller.resolve(key, { ...body, download: true });
  assert.equal(downloads, 1);
  await assert.rejects(
    controller.resolve(key, {
      ...body,
      userId: randomUUID(),
      userEmail: 'other@example.test',
    }),
    (e) => e.getStatus() === 403,
  );
  for (const bad of [
    { ...body, userId: 'bad' },
    { ...body, userEmail: '' },
    { ...body, download: 'false' },
    { ...body, refs: [null] },
    { ...body, refs: [{ documentId: 'bad' }] },
  ]) {
    await assert.rejects(
      controller.resolve(key, bad),
      (e) => e.getStatus() === 400,
    );
  }
  item.shares = [
    { shareWithUserId: randomUUID(), shareWithEmail: 'OWNER@example.test' },
  ];
  assert.equal(
    (await controller.resolve(key, { ...body, userId: randomUUID() })).data[0]
      .current,
    true,
  );
  item.shares = [];
  item.isArchived = true;
  await assert.rejects(
    controller.resolve(key, body),
    (e) => e.getStatus() === 403,
  );
  item.isArchived = false;
  const oldRefs = [{ documentId, versionId }];
  item.versions.unshift({ ...item.versions[0], id: randomUUID() });
  assert.equal(
    (await controller.resolve(key, { ...body, refs: oldRefs })).data[0].current,
    false,
  );
  for (const mode of ['development', 'production']) {
    process.env.NODE_ENV = mode;
    for (const weak of ['', 'local-internal-key']) {
      process.env.AI_DOCUMENT_SERVICE_KEY = weak;
      await assert.rejects(
        controller.resolve('local-internal-key', body),
        (e) => e.getStatus() === 401,
      );
    }
  }
});
