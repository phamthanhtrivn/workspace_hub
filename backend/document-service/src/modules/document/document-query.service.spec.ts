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
          assert.equal(query.where?.ownerUserId, 'owner');
          assert.equal(query.where?.parentFolderId, null);
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
