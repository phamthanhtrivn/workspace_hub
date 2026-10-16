const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
process.env.NODE_PATH = path.resolve(__dirname, '../dist');
require('node:module').Module._initPaths();
const { sign } = require('jsonwebtoken');
const {
  AiDelegationGuard,
} = require('../dist/modules/ai-integration/guards/ai-delegation.guard');
const {
  AiDocumentResolverService,
} = require('../dist/modules/ai-integration/ai-document-resolver.service');

const secret = 'test-only-delegation-key-32-characters';
const actor = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'owner@example.test',
};
const documentId = '20000000-0000-4000-8000-000000000001';

function context(token, documents, key = secret) {
  const request = {
    body: { documents },
    header(name) {
      return { 'x-internal-service-key': key, 'x-ai-delegation': token }[name];
    },
  };
  return { request, switchToHttp: () => ({ getRequest: () => request }) };
}

test('delegation binds actor, sources, issuer, audience, expiry and signature', () => {
  process.env.INTERNAL_SERVICE_KEY = secret;
  const documents = [{ documentId, versionId: 'original' }];
  const token = sign(
    { sub: actor.id, email: actor.email, sources: documents },
    secret,
    { issuer: 'ai-service', audience: 'document-ai', expiresIn: 60 },
  );
  const accepted = context(token, documents);
  assert.equal(new AiDelegationGuard().canActivate(accepted), true);
  assert.deepEqual(accepted.request.aiActor, actor);
  assert.throws(() =>
    new AiDelegationGuard().canActivate(
      context(token, [{ documentId: actor.id }]),
    ),
  );
  assert.throws(() =>
    new AiDelegationGuard().canActivate(context(token, documents, 'wrong')),
  );
  const expired = sign(
    { sub: actor.id, email: actor.email, sources: documents },
    secret,
    { issuer: 'ai-service', audience: 'document-ai', expiresIn: -1 },
  );
  assert.throws(() =>
    new AiDelegationGuard().canActivate(context(expired, documents)),
  );
});

function resolverFixture() {
  const observed = [];
  const document = {
    id: documentId,
    type: 'FILE',
    name: 'source.pdf',
    s3Key: 'latest-object',
  };
  const prisma = {
    documentItem: {
      findUnique: async () => ({ parentFolderId: null, isArchived: false }),
    },
    documentVersion: {
      findFirst: async (query) => {
        observed.push(query);
        return {
          id: '30000000-0000-4000-8000-000000000001',
          versionNumber: 1,
          s3Key: 'original-object',
        };
      },
    },
  };
  const storage = {
    describeAiSource: async (key) => {
      observed.push(key);
      return {
        etag: '"abc"',
        sizeBytes: 123,
        mimeType: 'application/pdf',
        downloadUrl: 'https://example.test/source',
      };
    },
  };
  const permissions = { checkPermission: async () => document };
  return {
    resolver: new AiDocumentResolverService(prisma, permissions, storage),
    prisma,
    permissions,
    observed,
  };
}

test('original resolves version one instead of the active object and verifies fingerprint', async () => {
  const { resolver, observed } = resolverFixture();
  const manifest = await resolver.resolve(
    actor,
    { documentId, versionId: 'original' },
    true,
  );
  assert.equal(observed[0].where.versionNumber, 1);
  assert.equal(observed[1], 'original-object');
  assert.equal(manifest.versionId, 'original');
  assert.equal(manifest.revision.length, 64);
  await assert.rejects(
    resolver.resolve(
      actor,
      { documentId, versionId: 'original', expectedRevision: 'changed' },
      true,
    ),
  );
});

test('archived ancestor and revoked permissions prevent descriptor creation', async () => {
  const archived = resolverFixture();
  archived.prisma.documentItem.findUnique = async () => ({
    parentFolderId: null,
    isArchived: true,
  });
  await assert.rejects(archived.resolver.resolve(actor, { documentId }, true));
  assert.deepEqual(archived.observed, []);
  const revoked = resolverFixture();
  revoked.permissions.checkPermission = async () => {
    throw new Error('forbidden');
  };
  await assert.rejects(revoked.resolver.resolve(actor, { documentId }, true));
  assert.deepEqual(revoked.observed, []);
});
