const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { isolatedPostgres } = require('../../scripts/isolated-postgres.cjs');
const { DocumentService } = require('../dist/modules/document/document.service');
const { QuotaService } = require('../dist/modules/quota/quota.service');
const { StorageCleanupService } = require('../dist/modules/document/storage-cleanup.service');

test('document lifecycle in isolated PostgreSQL', { skip: process.env.TEST_UX_POSTGRES !== 'true' }, async t => {
  const { prisma, cleanup } = await isolatedPostgres(path.resolve(__dirname, '..'));
  t.after(cleanup);
  const owner = randomUUID(), projectId = randomUUID(), objects = new Set();
  const quota = new QuotaService(prisma);
  const storage = {
    assertUploadSize: async (key) => assert.ok(objects.has(key)),
    copyFile: async source => { assert.ok(objects.has(source)); const key = `copy/${randomUUID()}`; objects.add(key); return key; },
    deleteFile: async key => objects.delete(key),
  };
  const garbage = new StorageCleanupService(prisma, storage);
  const documents = new DocumentService(prisma, quota, storage, { attachProfilesToDocumentVersions: async rows => rows, attachProfilesToDocumentItems: async rows => rows }, { publish: async () => {} }, garbage);
  await prisma.userStorageQuota.create({ data: { userId: owner, maxBytes: 100n, usedBytes: 0n } });

  await t.test('quota reservation is atomic at the limit', async () => {
    const results = await Promise.allSettled([60, 60].map(size => prisma.$transaction(tx => quota.reserve(tx, owner, size))));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await quota.getOrCreateQuota(owner)).usedBytes, 60n);
    await prisma.userStorageQuota.update({ where: { userId: owner }, data: { usedBytes: 0n } });
  });

  const originalKey = `personal/${randomUUID()}`; objects.add(originalKey);
  const original = await prisma.documentItem.create({ data: { name: 'file.pdf', type: 'FILE', ownerUserId: owner, ownerEmail: 'owner@example.test', s3Key: originalKey, sizeBytes: 10n,
    versions: { create: { versionNumber: 1, s3Key: originalKey, sizeBytes: 10n, uploadedBy: owner } } } });
  await prisma.userStorageQuota.update({ where: { userId: owner }, data: { usedBytes: 10n } });
  await prisma.documentItem.create({ data: { name: 'Project', type: 'FOLDER', ownerUserId: owner, ownerEmail: 'owner@example.test', projectId } });
  await t.test('root provisioning is idempotent and old revisions cannot restore removed access', async () => {
    const secondProject = randomUUID(), memberId = randomUUID();
    const initial = { name: 'Old name', ownerId: owner, ownerEmail: 'owner@example.test', syncRevision: '1', members: [{ userId: memberId, email: 'member@example.test', permission: 'VIEWER' }] };
    const latest = { ...initial, name: 'Latest name', syncRevision: '2', members: [] };
    await Promise.all([documents.ensureProjectRootFolder(secondProject, initial), documents.ensureProjectRootFolder(secondProject, latest)]);
    await documents.ensureProjectRootFolder(secondProject, initial);
    const roots = await prisma.documentItem.findMany({ where: { projectId: secondProject }, include: { shares: true } });
    assert.equal(roots.length, 1); assert.equal(roots[0].name, 'Latest name'); assert.equal(roots[0].shares.length, 0); assert.equal(roots[0].accessSyncRevision, 2n);
  });
  await t.test('a repeated upload confirmation returns the committed document instead of a name conflict', async () => {
    const uploader = randomUUID(), key = randomUUID(); objects.add(key);
    const dto = { name: 'retry.pdf', s3Key: key, sizeBytes: 3, mimeType: 'application/pdf' };
    const first = await documents.confirmUpload(uploader, 'uploader@example.test', dto);
    const retry = await documents.confirmUpload(uploader, 'uploader@example.test', dto);
    assert.equal(first.id, retry.id); assert.equal((await quota.getOrCreateQuota(uploader)).usedBytes, 3n);
  });
  let imported;
  await t.test('import retries reuse an independent copy and charge once', async () => {
    const operationId = randomUUID();
    [imported] = await documents.importTaskAttachmentDocuments(owner, 'owner@example.test', projectId, [original.id], operationId);
    const [retry] = await documents.importTaskAttachmentDocuments(owner, 'owner@example.test', projectId, [original.id], operationId);
    assert.equal(imported.id, retry.id);
    const copy = await prisma.documentItem.findUniqueOrThrow({ where: { id: imported.id } });
    assert.notEqual(copy.s3Key, originalKey);
    assert.equal((await quota.getOrCreateQuota(owner)).usedBytes, 20n);
  });
  await t.test('concurrent versions get distinct sequence numbers and count against the owner', async () => {
    const keys = [randomUUID(), randomUUID()]; keys.forEach(key => objects.add(key));
    const versions = await Promise.all(keys.map((key, index) => documents.createVersion(owner, 'owner@example.test', original.id, { s3Key: key, sizeBytes: index + 5, mimeType: 'application/pdf' })));
    assert.deepEqual(versions.map(version => version.versionNumber).sort(), [2, 3]);
    assert.equal((await quota.getOrCreateQuota(owner)).usedBytes, 31n);
  });
  await t.test('permanent deletion releases every version without breaking the imported file', async () => {
    const copy = await prisma.documentItem.findUniqueOrThrow({ where: { id: imported.id } });
    await documents.deleteItemPermanently(owner, 'owner@example.test', original.id);
    await garbage.drain();
    assert.equal(objects.has(originalKey), false); assert.equal(objects.has(copy.s3Key), true);
    assert.equal((await quota.getOrCreateQuota(owner)).usedBytes, 10n);
  });
  await t.test('legacy shared objects remain while any document version references them', async () => {
    const sharedKey = randomUUID(); objects.add(sharedKey);
    const entries = await Promise.all([1, 2].map(index => prisma.documentItem.create({ data: { name: `legacy${index}`, type: 'FILE', ownerUserId: owner, ownerEmail: 'owner@example.test', s3Key: sharedKey, sizeBytes: 1n,
      versions: { create: { versionNumber: 1, s3Key: sharedKey, sizeBytes: 1n, uploadedBy: owner } } } })));
    await documents.deleteItemPermanently(owner, 'owner@example.test', entries[0].id); await garbage.drain();
    assert.equal(objects.has(sharedKey), true);
    await documents.deleteItemPermanently(owner, 'owner@example.test', entries[1].id); await garbage.drain();
    assert.equal(objects.has(sharedKey), false);
  });
  await t.test('deleting a project folder refunds each document owner', async () => {
    const secondOwner = randomUUID();
    const root = await prisma.documentItem.findFirstOrThrow({ where: { projectId, parentFolderId: null } });
    const folder = await prisma.documentItem.create({ data: { name: 'Mixed ownership', type: 'FOLDER', ownerUserId: owner, ownerEmail: 'owner@example.test', projectId, parentFolderId: root.id } });
    await prisma.userStorageQuota.update({ where: { userId: owner }, data: { usedBytes: 15n } });
    await prisma.userStorageQuota.create({ data: { userId: secondOwner, usedBytes: 7n } });
    for (const [userId, bytes] of [[owner, 5], [secondOwner, 7]]) {
      const key = randomUUID(); objects.add(key);
      await prisma.documentItem.create({ data: { name: userId, type: 'FILE', ownerUserId: userId, ownerEmail: `${userId}@example.test`, projectId, parentFolderId: folder.id, s3Key: key, sizeBytes: BigInt(bytes),
        versions: { create: { versionNumber: 1, s3Key: key, sizeBytes: BigInt(bytes), uploadedBy: userId } } } });
    }
    await documents.deleteItemPermanently(owner, 'owner@example.test', folder.id);
    assert.equal((await quota.getOrCreateQuota(owner)).usedBytes, 10n);
    assert.equal((await quota.getOrCreateQuota(secondOwner)).usedBytes, 0n);
    assert.equal(await prisma.documentItem.count({ where: { parentFolderId: folder.id } }), 0);
  });
  await t.test('copy and metadata failures never leave empty imported documents', async () => {
    const key = randomUUID(); objects.add(key);
    const source = await prisma.documentItem.create({ data: { name: 'failure.pdf', type: 'FILE', ownerUserId: owner, ownerEmail: 'owner@example.test', s3Key: key, sizeBytes: 1n } });
    const copy = storage.copyFile;
    storage.copyFile = async () => { throw new Error('Copy failed'); };
    await assert.rejects(documents.importTaskAttachmentDocuments(owner, 'owner@example.test', projectId, [source.id], randomUUID()), /Copy failed/);
    storage.copyFile = copy;
    const before = await prisma.documentItem.count({ where: { projectId } });
    await prisma.userStorageQuota.update({ where: { userId: owner }, data: { maxBytes: 10n } });
    await assert.rejects(documents.importTaskAttachmentDocuments(owner, 'owner@example.test', projectId, [source.id], randomUUID()), /Insufficient storage/);
    assert.equal(await prisma.documentItem.count({ where: { projectId } }), before);
    const pending = await prisma.storageCleanupJob.findMany();
    assert.ok(pending.length > 0);
    await garbage.drain();
    assert.ok(pending.every(job => !objects.has(job.s3Key)));
    assert.equal(objects.has(key), true);
  });
});
