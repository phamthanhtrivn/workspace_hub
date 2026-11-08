import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { DocumentRole } from '../../common/enums/document.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentAccessService } from './document-access.service';
import { HttpException } from '@nestjs/common';

void test('shared access distinguishes restricted, expired, missing and unavailable documents', async () => {
  const file = {
    id: 'file',
    ownerUserId: 'owner',
    projectId: null,
    parentFolderId: null,
    isArchived: false,
    linkAccess: 'NONE',
    shareExpiresAt: null as Date | null,
    shares: [],
  };
  let current: typeof file | null = file;
  const access = new DocumentAccessService({
    documentItem: { findUnique: () => Promise.resolve(current) },
  } as unknown as PrismaService);
  const denied = async (code: string, status: number) => {
    await assert.rejects(access.checkPermission('file'), (error: unknown) => {
      assert.ok(error instanceof HttpException);
      assert.equal(error.getStatus(), status);
      assert.equal((error.getResponse() as { code?: string }).code, code);

      return true;
    });
  };
  await denied('DOCUMENT_ACCESS_RESTRICTED', 403);
  file.linkAccess = 'VIEWER';
  file.shareExpiresAt = new Date(0);
  await denied('DOCUMENT_LINK_EXPIRED', 403);
  await access.checkPermission('file', 'owner');
  file.isArchived = true;
  await denied('DOCUMENT_UNAVAILABLE', 403);
  current = null;
  await denied('DOCUMENT_NOT_FOUND', 404);
});

void test('a pending email grant binds once to the verified recipient id', async () => {
  const grant = {
    id: 'grant',
    shareWithUserId: null as string | null,
    shareWithEmail: 'recipient@example.test',
    permission: 'EDITOR',
  };
  const file = {
    id: 'file',
    ownerUserId: 'owner',
    projectId: null,
    parentFolderId: null,
    isArchived: false,
    linkAccess: 'NONE',
    shares: [grant],
  };
  const prisma = {
    documentItem: { findUnique: () => Promise.resolve(file) },
    documentShare: {
      updateMany: ({ data }: { data: { shareWithUserId: string } }) => {
        grant.shareWithUserId = data.shareWithUserId;

        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as PrismaService;
  const access = new DocumentAccessService(prisma);
  await access.checkPermission(
    'file',
    'recipient',
    'recipient@example.test',
    DocumentRole.EDITOR,
  );
  assert.equal(grant.shareWithUserId, 'recipient');
  await assert.rejects(
    access.checkPermission('file', 'other', 'recipient@example.test'),
  );
});

void test('project shares cannot outlive authoritative project membership or bypass an outage', async () => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.PROJECT_SERVICE_URL,
    previousKey = process.env.DOCUMENT_TO_PROJECT_KEY;
  process.env.PROJECT_SERVICE_URL = 'https://project-service.invalid';
  process.env.DOCUMENT_TO_PROJECT_KEY = 'test-only-key';
  const file = {
    id: 'file',
    ownerUserId: 'owner',
    projectId: 'project',
    shares: [{ shareWithUserId: 'removed', permission: 'EDITOR' }],
  };
  const prisma = {
    documentItem: { findUnique: () => Promise.resolve(file) },
  } as unknown as PrismaService;
  const access = new DocumentAccessService(prisma);
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new globalThis.Response(
          JSON.stringify({ owner: false, canEditDocuments: true }),
        ),
      );
    await access.checkPermission(
      'file',
      'removed',
      'removed@example.test',
      DocumentRole.EDITOR,
    );
    globalThis.fetch = () =>
      Promise.resolve(new globalThis.Response('{}', { status: 403 }));
    await assert.rejects(
      access.checkPermission('file', 'removed', 'removed@example.test'),
    );
    globalThis.fetch = () => Promise.reject(new Error('offline'));
    await assert.rejects(
      access.filterReadable(
        [{ id: 'file' }],
        'removed',
        'removed@example.test',
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.PROJECT_SERVICE_URL;
    else process.env.PROJECT_SERVICE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.DOCUMENT_TO_PROJECT_KEY;
    else process.env.DOCUMENT_TO_PROJECT_KEY = previousKey;
  }
});

void test('public editor links only grant viewing; named editor grants remain scoped and revocable', async () => {
  const file = {
    id: 'file',
    ownerUserId: 'owner',
    projectId: null,
    parentFolderId: null,
    isArchived: false,
    linkAccess: 'EDITOR',
    shareExpiresAt: null,
    shares: [] as Array<{
      shareWithUserId: string | null;
      shareWithEmail: string;
      permission: string;
    }>,
  };
  const prisma = { documentItem: { findUnique: () => Promise.resolve(file) } };
  const access = new DocumentAccessService(prisma as unknown as PrismaService);
  assert.equal(await access.getPermissionRole('file'), DocumentRole.VIEWER);
  await assert.rejects(
    access.checkPermission('file', undefined, undefined, DocumentRole.EDITOR),
  );
  await assert.rejects(
    access.checkPermission(
      'file',
      'viewer',
      'viewer@example.test',
      DocumentRole.EDITOR,
    ),
  );
  file.shares.push({
    shareWithUserId: 'editor',
    shareWithEmail: 'editor@example.test',
    permission: 'EDITOR',
  });
  await access.checkPermission(
    'file',
    'editor',
    'editor@example.test',
    DocumentRole.EDITOR,
  );
  await assert.rejects(
    access.checkPermission(
      'file',
      'other',
      'editor@example.test',
      DocumentRole.EDITOR,
    ),
  );
  file.linkAccess = 'NONE';
  file.shares = [];
  assert.deepEqual(
    await access.filterReadable(
      [{ id: 'file' }],
      'editor',
      'editor@example.test',
    ),
    [],
  );
  await access.checkPermission(
    'file',
    'owner',
    'owner@example.test',
    DocumentRole.OWNER,
  );
});

void test('named folder editor is inherited but an expired public link gives no access', async () => {
  const folder = {
    id: 'folder',
    ownerUserId: 'owner',
    projectId: null,
    parentFolderId: null,
    isArchived: false,
    linkAccess: 'VIEWER',
    shareExpiresAt: new Date(0),
    shares: [
      {
        shareWithUserId: 'editor',
        shareWithEmail: 'editor@example.test',
        permission: 'EDITOR',
      },
    ],
  };
  const child = {
    ...folder,
    id: 'child',
    parentFolderId: 'folder',
    shares: [],
    linkAccess: 'NONE',
  };
  const access = new DocumentAccessService({
    documentItem: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === 'child' ? child : folder),
    },
  } as unknown as PrismaService);
  await access.checkPermission(
    'child',
    'editor',
    'editor@example.test',
    DocumentRole.EDITOR,
  );
  await assert.rejects(access.checkPermission('child'));
});
