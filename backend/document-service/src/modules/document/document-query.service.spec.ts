import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ItemType, type Prisma } from '@prisma/client';
import { DocumentQueryService } from './document-query.service';
import { DocumentRole } from '../../common/enums/document.enum';
import type { PrismaService } from '../../prisma/prisma.service';
import type { DocumentAccessService } from './document-access.service';
import type { DocumentTreeService } from './document-tree.service';
import type { DocumentPresentationService } from './document-presentation.service';
import type { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import type { DocumentItem } from '@prisma/client';

function setup(shared = false) {
  const personal = {
    id: 'personal',
    name: 'Personal',
    type: ItemType.FOLDER,
    projectId: null,
    ownerUserId: 'owner',
    parentFolderId: null,
    sizeBytes: 0n,
    starredBy: [],
    isStarred: false,
  };
  const project = {
    ...personal,
    id: 'project-root',
    name: 'GatherTown',
    projectId: 'project',
  };
  const removed = { ...project, id: 'removed-project', projectId: 'removed' };
  const candidates = [personal, project, removed];
  const prisma = {
    documentItem: {
      findMany: (query: Prisma.DocumentItemFindManyArgs) => {
        if (!shared) {
          if (query.where?.parentFolderId) {
            if (query.where.parentFolderId === 'starred-folder')
              assert.equal(query.where.isStarred, true);
            else assert.equal(query.where.isStarred, false);
          } else if (query.where?.isStarred) {
            assert.equal(
              query.where.parentFolderId,
              null,
              'Starred root only includes top-level files and folders',
            );
            assert.equal(query.where.ownerUserId, 'owner');
            assert.equal(query.where.projectId, null);
          } else {
            assert.equal(query.where?.ownerUserId, 'owner');
            assert.equal(query.where?.parentFolderId, null);
            assert.equal(query.where?.isStarred, false);
            assert.equal(
              query.where?.projectId,
              undefined,
              'My files must include owned project root folders',
            );
            assert.equal(
              query.skip,
              undefined,
              'paginate after checking current project access',
            );
            assert.equal(query.take, undefined);
          }
        } else {
          assert.deepEqual(query.where?.ownerUserId, { not: 'owner' });
          assert.ok(query.where?.OR);
        }

        return Promise.resolve(candidates);
      },
      count: () => Promise.resolve(candidates.length),
    },
  } as unknown as PrismaService;
  const access = {
    filterReadable: () => Promise.resolve([personal, project]),
    getPermissionRole: () => Promise.resolve(DocumentRole.OWNER),
    checkPermission: () => Promise.resolve(personal),
  } as unknown as DocumentAccessService;
  const profiles = {
    attachProfilesToDocumentItems: (items: unknown) => Promise.resolve(items),
  } as unknown as UserProfileSnapshotService;
  const tree = {
    getFolderContainedSize: () => Promise.resolve(128),
  } as unknown as DocumentTreeService;

  return new DocumentQueryService(
    prisma,
    profiles,
    access,
    tree,
    {} as DocumentPresentationService,
  );
}

for (const role of [
  DocumentRole.OWNER,
  DocumentRole.EDITOR,
  DocumentRole.VIEWER,
]) {
  void test(`Chat metadata returns the effective project ${role} role independently of the uploader`, async () => {
    const item = {
      id: 'child',
      name: 'Project child',
      ownerUserId: 'uploader',
      ownerEmail: 'uploader@example.com',
      projectId: 'project',
      type: ItemType.FOLDER,
      sizeBytes: 0n,
      createdAt: new Date(),
      isArchived: false,
    } as DocumentItem;
    const access = {
      getAccessContext: () => Promise.resolve({ item, role }),
    } as unknown as DocumentAccessService;
    const tree = {
      getFolderContainedSize: () => Promise.resolve(128),
    } as unknown as DocumentTreeService;
    const presentation = {
      enrichDocumentItem: () =>
        Promise.resolve({ ...item, ownerProfile: { fullName: 'Uploader' } }),
    } as unknown as DocumentPresentationService;
    const query = new DocumentQueryService(
      {} as PrismaService,
      {} as UserProfileSnapshotService,
      access,
      tree,
      presentation,
    );
    const result = await query.getChatMetadata(
      'child',
      role === DocumentRole.OWNER ? 'project-owner' : 'uploader',
      'viewer@example.com',
    );
    assert.equal(result.userRole, role);
    assert.equal(result.projectId, 'project');
    assert.equal(result.sizeBytes, 128);
    assert.equal(result.hasPermission, true);
  });
}

void test('My files includes the owner project root and paginates after access checks', async () => {
  const result = await setup().getItems('owner', 'owner@example.test', {
    page: 2,
    limit: 1,
  });
  assert.equal(result.totalCount, 2);
  assert.deepEqual(
    result.items.map((item) => item.id),
    ['project-root'],
  );
});

void test('Shared retains its non-owner and explicit-share query scope', async () => {
  await setup(true).getItems('owner', 'owner@example.test', {
    isSharedOnly: true,
  });
});

void test('Starred root contains only the current user’s personal starred items', async () => {
  await setup().getItems('owner', 'owner@example.test', {
    isStarredOnly: true,
  });
});

void test('opening a folder from Starred lists only starred children', async () => {
  await setup().getItems('owner', 'owner@example.test', {
    folderId: 'starred-folder',
    isStarredOnly: true,
  });
});

void test('My files folders exclude their starred children', async () => {
  await setup().getItems('owner', 'owner@example.test', {
    folderId: 'my-folder',
  });
});

function setupStarredHierarchy() {
  const document = (
    id: string,
    name: string,
    type: ItemType,
    parentFolderId: string | null = null,
    overrides: Partial<DocumentItem> = {},
  ) =>
    ({
      id,
      name,
      type,
      parentFolderId,
      ownerUserId: 'owner',
      projectId: null,
      isStarred: true,
      isArchived: false,
      sizeBytes: 0n,
      ...overrides,
    }) as DocumentItem;
  const documents = [
    document('folder', 'A', ItemType.FOLDER),
    document('nested-folder', 'B', ItemType.FOLDER, 'folder'),
    document('child-file', 'match-child.pdf', ItemType.FILE, 'folder'),
    document('deep-file', 'match-deep.pdf', ItemType.FILE, 'nested-folder'),
    document('root-file', 'match-root.pdf', ItemType.FILE),
    document('my-file', 'match-personal.pdf', ItemType.FILE, null, {
      isStarred: false,
    }),
    document('other-owner-file', 'match-other.pdf', ItemType.FILE, null, {
      ownerUserId: 'other-owner',
    }),
    document('project-file', 'match-project.pdf', ItemType.FILE, null, {
      projectId: 'project',
    }),
  ];
  const matchingDocuments = (where: Prisma.DocumentItemWhereInput = {}) =>
    documents.filter(
      (document) =>
        document.isArchived === where.isArchived &&
        (where.parentFolderId === undefined ||
          document.parentFolderId === where.parentFolderId) &&
        (where.ownerUserId === undefined ||
          document.ownerUserId === where.ownerUserId) &&
        (where.projectId === undefined ||
          document.projectId === where.projectId) &&
        (where.isStarred === undefined ||
          document.isStarred === where.isStarred) &&
        (where.name === undefined ||
          document.name
            .toLowerCase()
            .includes(
              (
                (where.name as Prisma.StringFilter).contains as string
              ).toLowerCase(),
            )),
    );
  const prisma = {
    documentItem: {
      findMany: ({ where }: Prisma.DocumentItemFindManyArgs) =>
        Promise.resolve(matchingDocuments(where)),
      count: ({ where }: Prisma.DocumentItemCountArgs) =>
        Promise.resolve(matchingDocuments(where).length),
    },
  } as unknown as PrismaService;
  const access = {
    checkPermission: (id: string) =>
      Promise.resolve(documents.find((document) => document.id === id)),
    filterReadable: (documents: DocumentItem[]) => Promise.resolve(documents),
    getPermissionRole: () => Promise.resolve(DocumentRole.OWNER),
  } as unknown as DocumentAccessService;
  const profiles = {
    attachProfilesToDocumentItems: (documents: unknown) =>
      Promise.resolve(documents),
  } as unknown as UserProfileSnapshotService;
  const tree = {
    getFolderContainedSize: () => Promise.resolve(0),
  } as unknown as DocumentTreeService;

  return new DocumentQueryService(
    prisma,
    profiles,
    access,
    tree,
    {} as DocumentPresentationService,
  );
}

void test('Starred root shows the folder and standalone file without repeating its starred descendants', async () => {
  const result = await setupStarredHierarchy().getItems(
    'owner',
    'owner@example.test',
    { isStarredOnly: true },
  );
  assert.deepEqual(
    result.items.map((document) => document.id),
    ['folder', 'root-file'],
  );
  assert.equal(result.totalCount, 2);
  assert.ok(result.items.every((document) => document.isStarred));
});

void test('opening a starred folder shows its immediate children and preserves their star state', async () => {
  const result = await setupStarredHierarchy().getItems(
    'owner',
    'owner@example.test',
    { isStarredOnly: true, folderId: 'folder' },
  );
  assert.deepEqual(
    result.items.map((document) => document.id),
    ['nested-folder', 'child-file'],
  );
  assert.equal(result.totalCount, 2);
  assert.ok(result.items.every((document) => document.isStarred));
});

for (const [folderId, expectedId] of [
  [undefined, 'root-file'],
  ['folder', 'child-file'],
  ['nested-folder', 'deep-file'],
] as const) {
  void test(`Starred search stays at the current level: ${folderId ?? 'root'}`, async () => {
    const result = await setupStarredHierarchy().getItems(
      'owner',
      'owner@example.test',
      { isStarredOnly: true, folderId, search: 'MATCH' },
    );
    assert.deepEqual(
      result.items.map((document) => document.id),
      [expectedId],
    );
    assert.equal(result.totalCount, 1);
  });
}

void test('Starred search cannot return a match that only exists in a nested folder', async () => {
  const result = await setupStarredHierarchy().getItems(
    'owner',
    'owner@example.test',
    { isStarredOnly: true, folderId: 'folder', search: 'match-deep' },
  );
  assert.deepEqual(result.items, []);
  assert.equal(result.totalCount, 0);
});

void test('Starred root pagination counts only the current level', async () => {
  const result = await setupStarredHierarchy().getItems(
    'owner',
    'owner@example.test',
    { isStarredOnly: true, page: 2, limit: 1 },
  );
  assert.deepEqual(
    result.items.map((document) => document.id),
    ['root-file'],
  );
  assert.equal(result.totalCount, 2);
});
