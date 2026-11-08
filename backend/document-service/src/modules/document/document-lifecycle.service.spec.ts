import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { ItemType, type DocumentItem, type Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { DocumentRole } from '../../common/enums/document.enum';
import { DocumentLifecycleService } from './document-lifecycle.service';
import type { StorageCleanupService } from './storage-cleanup.service';
import type { DocumentLocationService } from './document-location.service';
import type { DocumentEventPublisher } from './document-event-publisher.service';
import type { DocumentPresentationService } from './document-presentation.service';
import type { DocumentAccessService } from './document-access.service';
import type { DocumentTreeService } from './document-tree.service';

function setup() {
  const source = {
    id: 'source',
    name: 'Folder',
    type: ItemType.FOLDER,
    projectId: null,
    parentFolderId: 'parent',
    ownerUserId: 'owner',
    isArchived: false,
  } as DocumentItem;
  const destination = { ...source, id: 'destination', parentFolderId: null };
  let circular = false;
  let canEdit = true;
  const prisma = {
    documentItem: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === 'source' ? source : destination),
    },
  } as unknown as PrismaService;
  const access = {
    checkPermission: (
      id: string,
      _user: string,
      _email: string,
      role: DocumentRole,
    ) => {
      if (!canEdit) throw new ForbiddenException();
      if (id === source.id)
        assert.equal(
          role,
          source.projectId ? DocumentRole.EDITOR : DocumentRole.OWNER,
        );

      return Promise.resolve(id === source.id ? source : destination);
    },
  } as unknown as DocumentAccessService;
  const tree = {
    isDescendant: () => Promise.resolve(circular),
  } as unknown as DocumentTreeService;
  const locations = {
    assertNoActiveSiblingWithName: () => Promise.resolve(),
  } as unknown as DocumentLocationService;
  const service = new DocumentLifecycleService(
    prisma,
    {} as StorageCleanupService,
    locations,
    {} as DocumentEventPublisher,
    {} as DocumentPresentationService,
    access,
    tree,
  );

  return {
    service,
    source,
    destination,
    circular: () => {
      circular = true;
    },
    revoke: () => {
      canEdit = false;
    },
  };
}

void test('single and bulk Move preparation retain project boundaries and reject cycles', async () => {
  const h = setup();
  h.destination.projectId = 'project';
  await assert.rejects(
    h.service.prepareMove('owner', 'owner@example.com', 'source', {
      parentFolderId: 'destination',
    }),
    /Personal documents cannot/,
  );
  h.source.projectId = 'project';
  assert.equal(
    (
      await h.service.prepareMove('owner', 'owner@example.com', 'source', {
        parentFolderId: 'destination',
      })
    ).destProjectId,
    'project',
  );
  h.destination.projectId = 'other';
  await assert.rejects(
    h.service.prepareMove('owner', 'owner@example.com', 'source', {
      parentFolderId: 'destination',
    }),
    /same project/,
  );
  h.destination.projectId = null;
  await assert.rejects(
    h.service.prepareMove('owner', 'owner@example.com', 'source', {
      parentFolderId: 'destination',
    }),
    /same project/,
  );
  h.source.projectId = null;
  h.circular();
  await assert.rejects(
    h.service.prepareMove('owner', 'owner@example.com', 'source', {
      parentFolderId: 'destination',
    }),
    /descendants/,
  );
});

void test('Move preparation rejects project root folders and rechecks edit access', async () => {
  const h = setup();
  h.source.projectId = 'project';
  h.source.parentFolderId = null;
  await assert.rejects(
    h.service.prepareMove('owner', 'owner@example.com', 'source', {
      parentFolderId: 'destination',
    }),
    /root folder cannot/,
  );
  h.source.projectId = null;
  h.revoke();
  await assert.rejects(
    h.service.prepareMove('owner', 'owner@example.com', 'source', {
      parentFolderId: 'destination',
    }),
    ForbiddenException,
  );
});

void test('overlapping deleted trees reclaim each file version once and enqueue storage cleanup in the same transaction', async () => {
  const quotas: Array<[bigint, string]> = [];
  const keys: string[] = [];
  const tx = {
    documentItem: {
      findMany: ({ where }: Prisma.DocumentItemFindManyArgs) => {
        assert.deepEqual(
          new Set((where?.id as { in: string[] }).in),
          new Set(['parent', 'child', 'file']),
        );

        return Promise.resolve([
          {
            ownerUserId: 'uploader',
            s3Key: 'latest',
            sizeBytes: 20n,
            versions: [
              { s3Key: 'old', sizeBytes: 10n },
              { s3Key: 'latest', sizeBytes: 20n },
            ],
          },
        ]);
      },
      deleteMany: () => Promise.resolve({ count: 3 }),
    },
    $executeRaw: (
      _strings: TemplateStringsArray,
      bytes: bigint,
      owner: string,
    ) => {
      quotas.push([bytes, owner]);

      return Promise.resolve(1);
    },
  } as unknown as Prisma.TransactionClient;
  const tree = {
    lockDocumentTree: (_tx: unknown, id: string) =>
      Promise.resolve(
        id === 'parent' ? ['parent', 'child', 'file'] : ['child', 'file'],
      ),
  } as unknown as DocumentTreeService;
  const cleanup = {
    enqueue: (actualTx: unknown, storedKeys: string[]) => {
      assert.equal(actualTx, tx);
      keys.push(...storedKeys);

      return Promise.resolve();
    },
  } as unknown as StorageCleanupService;
  const service = new DocumentLifecycleService(
    {} as PrismaService,
    cleanup,
    {} as DocumentLocationService,
    {} as DocumentEventPublisher,
    {} as DocumentPresentationService,
    {} as DocumentAccessService,
    tree,
  );
  await service.deleteTreesInTransaction(tx, ['parent', 'child']);
  assert.deepEqual(quotas, [[30n, 'uploader']]);
  assert.deepEqual(new Set(keys), new Set(['old', 'latest']));
});
