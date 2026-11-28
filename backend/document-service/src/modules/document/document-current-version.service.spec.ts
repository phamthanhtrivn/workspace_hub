import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ItemType } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { S3Service } from '../../infrastructure/s3/s3.service';
import { DocumentRole } from '../../common/enums/document.enum';
import type { DocumentAccessService } from './document-access.service';
import type { DocumentEventPublisher } from './document-event-publisher.service';
import type { DocumentPresentationService } from './document-presentation.service';
import { DocumentCurrentVersionService } from './document-current-version.service';
import { DocumentUploadService } from './document-upload.service';
import type { QuotaService } from '../quota/quota.service';
import type { DocumentLocationService } from './document-location.service';
import { SetCurrentVersionDto } from './dto/set-current-version.dto';
import { validateSync } from 'class-validator';
import { DocumentQueryService } from './document-query.service';
import { DocumentPublicQueryService } from './document-public-query.service';
import type { DocumentTreeService } from './document-tree.service';
import type { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';

function setup() {
  const document = {
    id: 'file',
    name: 'Report.pdf',
    type: ItemType.FILE as ItemType,
    ownerUserId: 'owner',
    ownerEmail: 'owner@example.com',
    projectId: null,
    parentFolderId: null,
    isArchived: false,
    isStarred: false,
    s3Key: 'new-key',
    sizeBytes: 20n,
    mimeType: 'application/pdf',
    createdAt: new Date(),
    shares: [],
  };
  const history = [
    {
      id: 'v2',
      documentItemId: 'file',
      versionNumber: 2,
      s3Key: 'new-key',
      sizeBytes: 20n,
      uploadedBy: 'owner',
      createdAt: new Date(),
    },
    {
      id: 'v1',
      documentItemId: 'file',
      versionNumber: 1,
      s3Key: 'old-key',
      sizeBytes: 10n,
      uploadedBy: 'owner',
      createdAt: new Date(),
    },
  ];
  const calls: string[] = [];
  let denied = false;
  const access = {
    checkPermission: (
      _id: string,
      _userId: string | undefined,
      _email: string | undefined,
      role: DocumentRole,
    ) => {
      calls.push(`permission:${role}`);
      if (denied) return Promise.reject(new ForbiddenException());

      return Promise.resolve(document);
    },
  } as unknown as DocumentAccessService;
  const tx = {
    $queryRaw: () => {
      calls.push('lock');

      return Promise.resolve([]);
    },
    documentItem: {
      findUniqueOrThrow: () => Promise.resolve(document),
      update: ({ data }: { data: Partial<typeof document> }) => {
        calls.push('update');
        Object.assign(document, data);

        return Promise.resolve({ ...document });
      },
    },
    documentVersion: {
      findUnique: ({
        where,
      }: {
        where: { id: string; documentItemId: string };
      }) => {
        assert.ok(calls.includes('lock'));

        return Promise.resolve(
          history.find(
            (version) =>
              version.id === where.id &&
              version.documentItemId === where.documentItemId,
          ) ?? null,
        );
      },
      findMany: () => Promise.resolve(history),
    },
  };
  const prisma = {
    ...tx,
    $transaction: (operation: (transaction: typeof tx) => Promise<unknown>) =>
      operation(tx),
  } as unknown as PrismaService;
  const storage = {
    getFileMetadata: (key: string) => {
      calls.push(`metadata:${key}`);

      return Promise.resolve({ sizeBytes: 10, mimeType: 'text/plain' });
    },
  } as unknown as S3Service;
  const events = {
    publishProjectDocumentEvent: () => {
      calls.push('event');

      return Promise.resolve();
    },
  } as unknown as DocumentEventPublisher;
  const presentation = {
    enrichDocumentItem: (value: unknown) => Promise.resolve(value),
  } as DocumentPresentationService;
  const service = new DocumentCurrentVersionService(
    prisma,
    access,
    storage,
    events,
    presentation,
  );

  return {
    service,
    tx,
    events,
    presentation,
    document,
    history,
    calls,
    access,
    prisma,
    deny: () => {
      denied = true;
    },
  };
}

void test('selecting an older version updates the active file atomically without copying or changing history', async () => {
  const fixture = setup();
  const originalHistory = structuredClone(fixture.history);
  await fixture.service.setCurrentVersion(
    'file',
    'v1',
    'owner',
    'owner@example.com',
  );
  assert.equal(fixture.document.s3Key, 'old-key');
  assert.equal(fixture.document.sizeBytes, 10n);
  assert.equal(fixture.document.mimeType, 'text/plain');
  assert.equal(fixture.document.name, 'Report.pdf');
  assert.deepEqual(fixture.history, originalHistory);
  assert.deepEqual(fixture.calls, [
    'permission:EDITOR',
    'lock',
    'metadata:old-key',
    'update',
    'event',
  ]);
});

void test('viewers and revoked grants cannot change the current version', async () => {
  const fixture = setup();
  fixture.deny();
  await assert.rejects(
    fixture.service.setCurrentVersion('file', 'v1'),
    ForbiddenException,
  );
  assert.deepEqual(fixture.calls, ['permission:EDITOR']);
});

void test('versions from other documents are rejected before storage reads or updates', async () => {
  const fixture = setup();
  fixture.history[1].documentItemId = 'another-file';
  await assert.rejects(
    fixture.service.setCurrentVersion('file', 'v1', 'owner'),
    NotFoundException,
  );
  assert.equal(fixture.document.s3Key, 'new-key');
  assert.deepEqual(fixture.calls, ['permission:EDITOR', 'lock']);
});

void test('folders, trashed documents and starred copies cannot change versions', async () => {
  for (const patch of [
    { type: ItemType.FOLDER },
    { isArchived: true },
    { isStarred: true },
  ]) {
    const fixture = setup();
    Object.assign(fixture.document, patch);
    await assert.rejects(
      fixture.service.setCurrentVersion('file', 'v1', 'owner'),
      BadRequestException,
    );
    assert.ok(!fixture.calls.includes('update'));
  }
});

void test('saving the current version again is idempotent and does not fetch the object', async () => {
  const fixture = setup();
  await fixture.service.setCurrentVersion('file', 'v2', 'owner');
  assert.ok(!fixture.calls.includes('update'));
  assert.ok(!fixture.calls.some((call) => call.startsWith('metadata:')));
});

void test('inconsistent stored metadata cannot partially change the current file', async () => {
  const fixture = setup();
  fixture.history[1].sizeBytes = 999n;
  await assert.rejects(
    fixture.service.setCurrentVersion('file', 'v1', 'owner'),
    ConflictException,
  );
  assert.equal(fixture.document.s3Key, 'new-key');
  assert.equal(fixture.document.sizeBytes, 20n);
  assert.ok(!fixture.calls.includes('update'));
  assert.ok(!fixture.calls.includes('event'));
});

void test('private and shared version history mark the active file rather than the newest upload', async () => {
  const fixture = setup();
  fixture.document.s3Key = 'old-key';
  const profiles = {
    attachProfilesToDocumentVersions: (versions: unknown[]) =>
      Promise.resolve(versions),
  } as unknown as UserProfileSnapshotService;
  const privateQuery = new DocumentQueryService(
    fixture.prisma,
    profiles,
    fixture.access,
    {} as DocumentTreeService,
    {} as DocumentPresentationService,
  );
  const publicQuery = new DocumentPublicQueryService(
    fixture.prisma,
    fixture.access,
    {} as DocumentTreeService,
  );
  for (const versions of [
    await privateQuery.getVersions('owner', 'owner@example.com', 'file'),
    await publicQuery.getPublicVersions('file', 'owner', 'owner@example.com'),
  ]) {
    assert.equal(versions[0].isCurrent, false);
    assert.equal(versions[1].isCurrent, true);
    assert.equal(versions[0].versionNumber, 2);
  }
});

void test('uploading after selecting an older version still creates the next version and makes it current', async () => {
  const fixture = setup();
  await fixture.service.setCurrentVersion('file', 'v1', 'owner');
  const transaction = {
    ...fixture.tx,
    documentVersion: {
      ...fixture.tx.documentVersion,
      findFirst: ({ where }: { where: { s3Key?: string } }) =>
        Promise.resolve(
          where.s3Key
            ? (fixture.history.find(
                (version) => version.s3Key === where.s3Key,
              ) ?? null)
            : fixture.history[0],
        ),
      create: ({
        data,
      }: {
        data: Omit<(typeof fixture.history)[number], 'id' | 'createdAt'>;
      }) => {
        const version = { ...data, id: 'v3', createdAt: new Date() };
        fixture.history.unshift(version);

        return Promise.resolve(version);
      },
    },
  };
  const prisma = {
    ...fixture.prisma,
    $transaction: (operation: (tx: typeof transaction) => Promise<unknown>) =>
      operation(transaction),
  } as unknown as PrismaService;
  const profiles = {
    attachProfilesToDocumentVersions: (versions: unknown[]) =>
      Promise.resolve(versions),
  } as unknown as UserProfileSnapshotService;
  const uploads = new DocumentUploadService(
    { reserve: () => Promise.resolve() } as unknown as QuotaService,
    { assertUploadSize: () => Promise.resolve() } as unknown as S3Service,
    prisma,
    profiles,
    {} as DocumentLocationService,
    fixture.presentation,
    fixture.events,
    fixture.access,
  );
  const version = await uploads.createVersion(
    'owner',
    'owner@example.com',
    'file',
    { s3Key: 'third-key', sizeBytes: 30, mimeType: 'application/pdf' },
  );
  assert.equal(version.versionNumber, 3);
  assert.equal(fixture.document.s3Key, 'third-key');
  assert.equal(fixture.document.sizeBytes, 30n);
  assert.equal(fixture.history.length, 3);
});

void test('current version requests reject missing or invalid version IDs', () => {
  for (const versionId of [undefined, '', 'original', 'not-a-uuid']) {
    assert.ok(
      validateSync(Object.assign(new SetCurrentVersionDto(), { versionId }))
        .length,
    );
  }
  assert.equal(
    validateSync(
      Object.assign(new SetCurrentVersionDto(), {
        versionId: '11111111-1111-4111-8111-111111111111',
      }),
    ).length,
    0,
  );
});
