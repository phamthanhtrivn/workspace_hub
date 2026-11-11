import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ItemType, type DocumentItem, type Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { DocumentAccessService } from './document-access.service';
import { DocumentLocationService } from './document-location.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentUploadService } from './document-upload.service';

void test('Starred folders reject direct create-folder, upload initiation and upload confirmation requests', async () => {
  const folder = {
    id: 'folder',
    type: ItemType.FOLDER,
    isStarred: true,
    isArchived: false,
  } as DocumentItem;
  const access = {
    checkPermission: () => Promise.resolve(folder),
  } as unknown as DocumentAccessService;
  const locations = new DocumentLocationService({} as PrismaService, access);
  const lifecycle = new DocumentLifecycleService(
    {} as never,
    {} as never,
    locations,
    {} as never,
    {} as never,
    access,
    {} as never,
    { publishForItem: () => Promise.resolve() } as never,
  );
  const uploads = new DocumentUploadService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    locations,
    {} as never,
    {} as never,
    access,
  );
  await assert.rejects(
    lifecycle.createFolder('owner', 'owner@example.test', {
      name: 'new',
      parentFolderId: folder.id,
    }),
    /from My files only/,
  );
  const upload = {
    parentFolderId: folder.id,
    name: 'new.txt',
    mimeType: 'text/plain',
    sizeBytes: 1,
  };
  await assert.rejects(
    uploads.initiateUpload('owner', 'owner@example.test', upload),
    /from My files only/,
  );
  await assert.rejects(
    uploads.confirmUpload('owner', 'owner@example.test', {
      ...upload,
      s3Key: 'unused',
    }),
    /from My files only/,
  );
});

void test('upload and folder creation recheck the locked parent after it moves into Starred', async () => {
  const locations = new DocumentLocationService(
    {} as PrismaService,
    {} as DocumentAccessService,
  );
  let locked = false;
  const tx = {
    $queryRaw: () => {
      locked = true;

      return Promise.resolve([]);
    },
    documentItem: {
      findUnique: () => {
        assert.equal(locked, true);

        return Promise.resolve({ isArchived: false, isStarred: true });
      },
    },
  } as unknown as Prisma.TransactionClient;
  await assert.rejects(
    locations.lockWritableParent(tx, 'folder'),
    /from My files only/,
  );
});

void test('root name conflicts are scoped independently to My files and Starred', async () => {
  const checked: boolean[] = [];
  const prisma = {
    documentItem: {
      findFirst: ({ where }: Prisma.DocumentItemFindFirstArgs) => {
        checked.push(where?.isStarred as boolean);

        return Promise.resolve(
          where?.isStarred ? null : { name: 'same.txt', type: ItemType.FILE },
        );
      },
    },
  } as unknown as PrismaService;
  const locations = new DocumentLocationService(
    prisma,
    {} as DocumentAccessService,
  );
  await locations.assertNoActiveSiblingWithName(
    'owner',
    'same.txt',
    null,
    null,
    'file',
    true,
  );
  await assert.rejects(
    locations.assertNoActiveSiblingWithName(
      'owner',
      'same.txt',
      null,
      null,
      'file',
      false,
    ),
    /already exists/,
  );
  assert.deepEqual(checked, [true, false]);
});
