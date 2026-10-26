const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { NotebookBridgeController } = require('../dist/modules/notebook-bridge/notebook-bridge.module');
const key = 'fixture-document-key-not-production-000';
function setup(t) {
  const previous = process.env.AI_DOCUMENT_SERVICE_KEY;
  process.env.AI_DOCUMENT_SERVICE_KEY = key;
  t.after(() => previous === undefined ? delete process.env.AI_DOCUMENT_SERVICE_KEY : process.env.AI_DOCUMENT_SERVICE_KEY = previous);
  const userId = randomUUID(), versionId = randomUUID(), documentId = randomUUID();
  const s3Key = `documents/${userId}/${randomUUID()}_sample.pdf`;
  const version = { id: versionId, documentItemId: documentId, s3Key, sizeBytes: 42n };
  let query, unavailable = false, signed = 0;
  const controller = new NotebookBridgeController({
    userProfileSnapshot: { findUnique: async () => ({ email: 'member@example.test' }) },
    documentVersion: { findFirst: async options => { query = options; return unavailable ? null : version; } },
  }, { generatePresignedDownloadUrl: async storage => { assert.equal(storage, s3Key); signed++; return 'https://storage.example.test/signed'; } });
  return { controller, body: { userId, s3Key }, query: () => query, signed: () => signed, deny: () => { unavailable = true; }, version };
}
test('Documents files require a dedicated service key and a valid bound reference', async t => {
  const { controller, body, signed } = setup(t);
  for (const supplied of ['', 'wrong-key']) await assert.rejects(controller.resolveChatAttachment(supplied, body), e => e.getStatus() === 401);
  for (const update of [{ userId: 'bad' }, { s3Key: 'chat-media/other/file.pdf' }, { s3Key: 'documents/../private.pdf' }, { download: 'true' }])
    await assert.rejects(controller.resolveChatAttachment(key, { ...body, ...update }), e => e.getStatus() === 400);
  assert.equal(signed(), 0);
});
test('resolution queries registered versions with owner/explicit-share rights and excludes archived sources', async t => {
  const { controller, body, query, signed } = setup(t);
  const result = await controller.resolveChatAttachment(key, body);
  assert.equal(result.data.sizeBytes, 42);
  assert.match(result.data.revision, /^[a-f0-9]{64}$/);
  assert.equal(result.data.downloadUrl, undefined);
  const where = query().where;
  assert.equal(where.s3Key, body.s3Key);
  assert.equal(where.documentItem.type, 'FILE');
  assert.equal(where.documentItem.isArchived, false);
  assert.deepEqual(where.documentItem.OR[0], { ownerUserId: body.userId });
  assert.deepEqual(where.documentItem.OR[1].shares.some.OR, [
    { shareWithUserId: body.userId },
    { shareWithEmail: { equals: 'member@example.test', mode: 'insensitive' } },
  ]);
  assert.ok(!JSON.stringify(where).includes('linkAccess'));
  assert.equal(signed(), 0);
  const download = await controller.resolveChatAttachment(key, { ...body, download: true });
  assert.match(download.data.downloadUrl, /^https:/);
  assert.equal(signed(), 1);
});
test('missing, private, archived or revoked versions cannot obtain signed download URLs', async t => {
  const { controller, body, deny, signed } = setup(t);
  deny();
  await assert.rejects(controller.resolveChatAttachment(key, { ...body, download: true }), e => e.getStatus() === 403);
  assert.equal(signed(), 0);
});
test('oversized registered versions fail before signing', async t => {
  const { controller, body, version, signed } = setup(t);
  version.sizeBytes = 21n * 1024n * 1024n;
  await assert.rejects(controller.resolveChatAttachment(key, { ...body, download: true }), e => e.getStatus() === 400);
  assert.equal(signed(), 0);
});
