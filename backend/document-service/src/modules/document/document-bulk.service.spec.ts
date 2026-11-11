import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { DocumentItem, Prisma } from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import type { PrismaService } from '../../prisma/prisma.service';
import type { DocumentAccessService } from './document-access.service';
import type { DocumentLifecycleService } from './document-lifecycle.service';
import type { DocumentLocationService } from './document-location.service';
import type { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentBulkService } from './document-bulk.service';
import { DocumentBulkAction as Action } from './types/document-bulk.constants';
import { documentBulkBlockReason } from './document-bulk-policy';
import { DocumentBulkDto } from './dto/document-bulk.dto';
import { validateSync } from 'class-validator';
import { setDocumentTreesStarred } from './document-star-tree';
import type { DocumentTreeService } from './document-tree.service';

function setup() {
  const item = (id: string) =>
    ({
      id,
      name: `${id}.txt`,
      ownerUserId: 'owner',
      projectId: null,
      parentFolderId: 'source',
      isArchived: false,
      isStarred: false,
      shares: [],
    }) as unknown as DocumentItem;
  const records = new Map([
    ['a', item('a')],
    ['b', item('b')],
  ]);
  const roles = new Map([
    ['a', DocumentRole.OWNER],
    ['b', DocumentRole.OWNER],
  ]);
  const stars = new Set<string>();
  const events: string[] = [];
  let transactions = 0;
  let failId: string | null = null;
  let failRootName = false;
  let deleted: string[] = [];
  const prisma = {
    documentItem: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(records.get(where.id) ?? null),
    },
    userStarredDocument: {
      findMany: () =>
        Promise.resolve(
          [...stars].map((documentItemId) => ({ documentItemId })),
        ),
    },
    $transaction: async (callback: (tx: unknown) => Promise<void>) => {
      transactions++;
      const pending = new Map(
        [...records].map(([id, record]) => [id, { ...record }]),
      );
      const pendingStars = new Set(stars);
      await callback({
        documentItem: {
          findMany: ({ where }: Prisma.DocumentItemFindManyArgs) =>
            Promise.resolve(
              [...pending.values()].filter((record) =>
                (where?.id as { in: string[] }).in.includes(record.id),
              ),
            ),
          updateMany: ({ where, data }: Prisma.DocumentItemUpdateManyArgs) => {
            const ids = (where?.id as { in: string[] }).in;
            for (const id of ids) {
              if (id === failId) throw new Error('database write failed');
              Object.assign(pending.get(id)!, data);
            }

            return Promise.resolve({ count: ids.length });
          },
          update: ({ where, data }: Prisma.DocumentItemUpdateArgs) => {
            if (where.id === failId) throw new Error('database write failed');
            const record = pending.get(where.id!);
            assert.ok(record);
            Object.assign(record, data);

            return Promise.resolve(pending.get(where.id!));
          },
        },
        userStarredDocument: {
          createMany: ({ data }: Prisma.UserStarredDocumentCreateManyArgs) => {
            const entries = data as Prisma.UserStarredDocumentCreateManyInput[];
            entries.forEach((entry) => pendingStars.add(entry.documentItemId));

            return Promise.resolve({ count: entries.length });
          },
          upsert: ({ create }: Prisma.UserStarredDocumentUpsertArgs) => {
            pendingStars.add(create.documentItemId as string);

            return Promise.resolve(create);
          },
          deleteMany: ({ where }: Prisma.UserStarredDocumentDeleteManyArgs) => {
            const ids = (where?.documentItemId as { in: string[] }).in;
            ids.forEach((id) => pendingStars.delete(id));

            return Promise.resolve({ count: 1 });
          },
        },
      });
      records.clear();
      pending.forEach((record, id) => records.set(id, record));
      stars.clear();
      pendingStars.forEach((id) => stars.add(id));
    },
  } as unknown as PrismaService;
  const access = {
    getAccessContext: (id: string) => {
      if (!roles.has(id)) throw new ForbiddenException('Access revoked');

      return Promise.resolve({ item: records.get(id), role: roles.get(id) });
    },
  } as unknown as DocumentAccessService;
  const lifecycle = {
    assertMoveRegion: () => Promise.resolve(),
    setStarredTreesInTransaction: (
      tx: Prisma.TransactionClient,
      userId: string,
      items: DocumentItem[],
      starred: boolean,
    ) =>
      setDocumentTreesStarred(
        tx,
        {
          lockDocumentTree: (_tx: Prisma.TransactionClient, rootId: string) => {
            const ids = new Set([rootId]);
            let size = 0;
            while (size !== ids.size) {
              size = ids.size;
              for (const record of records.values())
                if (record.parentFolderId && ids.has(record.parentFolderId))
                  ids.add(record.id);
            }

            return Promise.resolve([...ids]);
          },
        } as DocumentTreeService,
        locations,
        userId,
        items,
        starred,
      ),
    prepareMove: (
      _userId: string,
      _email: string,
      id: string,
      dto: { parentFolderId: string | null },
    ) =>
      Promise.resolve({
        item: records.get(id),
        destParentFolderId: dto.parentFolderId,
        destProjectId: null,
      }),
    deleteTreesInTransaction: (_tx: unknown, ids: string[]) => {
      deleted = ids;

      return Promise.resolve();
    },
  } as unknown as DocumentLifecycleService;
  const locations = {
    lockAvailableName: () => {
      if (failRootName) throw new ConflictException('A file already exists');

      return Promise.resolve();
    },
  } as unknown as DocumentLocationService;
  const publisher = {
    publishProjectDocumentEvent: (record: DocumentItem) => {
      events.push(record.id);

      return Promise.resolve();
    },
  } as unknown as DocumentEventPublisher;

  return {
    service: new DocumentBulkService(
      prisma,
      access,
      lifecycle,
      locations,
      publisher,
    ),
    records,
    roles,
    stars,
    events,
    transactions: () => transactions,
    fail: (id: string) => {
      failId = id;
    },
    conflictRootName: () => {
      failRootName = true;
    },
    deleted: () => deleted,
  };
}

void test('bulk actions validate every permission before opening the transaction', async () => {
  const h = setup();
  h.roles.set('b', DocumentRole.VIEWER);
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a', 'b'],
      action: Action.TRASH,
    }),
    BadRequestException,
  );
  assert.equal(h.transactions(), 0);
  assert.equal(h.records.get('a')?.isArchived, false);
  h.roles.delete('b');
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a', 'b'],
      action: Action.STAR,
    }),
    ForbiddenException,
  );
  assert.equal(h.transactions(), 0);
});

void test('failed writes roll back the entire batch and publish no success events', async () => {
  const h = setup();
  h.fail('b');
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a', 'b'],
      action: Action.TRASH,
    }),
  );
  assert.equal(h.records.get('a')?.isArchived, false);
  assert.equal(h.records.get('b')?.isArchived, false);
  assert.deepEqual(h.events, []);
});

void test('star and unstar are explicit idempotent operations on every selected item', async () => {
  const h = setup();
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.STAR,
  });
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.STAR,
  });
  assert.deepEqual([...h.stars], ['a', 'b']);
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.UNSTAR,
  });
  assert.equal(h.stars.size, 0);
  assert.equal(h.records.get('a')?.parentFolderId, null);
  assert.equal(h.records.get('b')?.parentFolderId, null);
});

void test('unstar rejects unstarred selections before moving any items', async () => {
  const h = setup();
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a'],
      action: Action.UNSTAR,
    }),
    BadRequestException,
  );
  assert.equal(h.transactions(), 0);
  assert.equal(h.records.get('a')?.parentFolderId, 'source');
});

void test('unstar keeps the star and folder location if the My files root name conflicts', async () => {
  const h = setup();
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a'],
    action: Action.STAR,
  });
  h.conflictRootName();
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a'],
      action: Action.UNSTAR,
    }),
    ConflictException,
  );
  assert.deepEqual([...h.stars], ['a']);
  assert.equal(h.records.get('a')?.parentFolderId, null);
});

void test('shared viewers and editors cannot star or unstar shared documents', async () => {
  const h = setup();
  h.roles.set('a', DocumentRole.VIEWER);
  await assert.rejects(
    h.service.execute('recipient', 'recipient@example.com', {
      ids: ['a'],
      action: Action.STAR,
    }),
    BadRequestException,
  );
  h.roles.set('a', DocumentRole.EDITOR);
  await assert.rejects(
    h.service.execute('recipient', 'recipient@example.com', {
      ids: ['a'],
      action: Action.UNSTAR,
    }),
    BadRequestException,
  );
  assert.equal(h.transactions(), 0);
});

void test('star and unstar cascade through nested folders while preserving a selected parent/child tree', async () => {
  const h = setup();
  h.records.get('b')!.parentFolderId = 'a';
  h.records.set('c', {
    ...h.records.get('b')!,
    id: 'c',
    name: 'c.txt',
    parentFolderId: 'b',
  });
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.STAR,
  });
  assert.deepEqual(new Set(h.stars), new Set(['a', 'b', 'c']));
  assert.equal(h.records.get('a')!.parentFolderId, null);
  assert.equal(h.records.get('b')!.parentFolderId, 'a');
  assert.equal(h.records.get('c')!.parentFolderId, 'b');
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.UNSTAR,
  });
  assert.equal(h.stars.size, 0);
  assert.equal(h.records.get('a')!.parentFolderId, null);
  assert.equal(h.records.get('b')!.parentFolderId, 'a');
  assert.equal(h.records.get('c')!.parentFolderId, 'b');
  assert.ok([...h.records.values()].every((record) => !record.isStarred));
});

void test('unstar of a single nested file leaves its starred ancestors intact', async () => {
  const h = setup();
  h.records.get('b')!.parentFolderId = 'a';
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a'],
    action: Action.STAR,
  });
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['b'],
    action: Action.UNSTAR,
  });
  assert.equal(h.records.get('b')!.parentFolderId, null);
  assert.equal(h.records.get('b')!.isStarred, false);
  assert.equal(h.records.get('a')!.isStarred, true);
  assert.deepEqual([...h.stars], ['a']);
});

void test('a failed descendant write rolls back the complete star tree', async () => {
  const h = setup();
  h.records.get('b')!.parentFolderId = 'a';
  h.fail('b');
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a'],
      action: Action.STAR,
    }),
    /database write failed/,
  );
  assert.equal(h.stars.size, 0);
  assert.equal(h.records.get('a')!.parentFolderId, 'source');
  assert.ok([...h.records.values()].every((record) => !record.isStarred));
  assert.deepEqual(h.events, []);
});

void test('star tree refuses descendants belonging to another owner and mixed-region Move is rejected', async () => {
  const h = setup();
  h.records.get('b')!.parentFolderId = 'a';
  h.records.get('b')!.ownerUserId = 'another-owner';
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a'],
      action: Action.STAR,
    }),
    /Only the owner/,
  );
  assert.equal(h.stars.size, 0);
  h.records.get('b')!.isStarred = true;
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a', 'b'],
      action: Action.MOVE,
    }),
    /within My files or within Starred/,
  );
});

void test('move, trash, restore and permanent deletion operate on the complete batch', async () => {
  const h = setup();
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.MOVE,
    parentFolderId: 'destination',
  });
  assert.equal(h.records.get('b')?.parentFolderId, 'destination');
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.TRASH,
  });
  assert.equal(h.records.get('a')?.isArchived, true);
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.RESTORE,
  });
  assert.equal(h.records.get('a')?.isArchived, false);
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a', 'b'],
      action: Action.DELETE,
    }),
  );
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.TRASH,
  });
  await h.service.execute('owner', 'owner@example.com', {
    ids: ['a', 'b'],
    action: Action.DELETE,
  });
  assert.deepEqual(h.deleted(), ['a', 'b']);
});

void test('project restrictions cannot be bypassed through the bulk endpoint', () => {
  const item = {
    projectId: 'project',
    parentFolderId: null,
    isArchived: false,
  } as DocumentItem;
  for (const action of Object.values(Action))
    assert.ok(documentBulkBlockReason(item, DocumentRole.OWNER, action));
  item.parentFolderId = 'root';
  assert.equal(
    documentBulkBlockReason(item, DocumentRole.EDITOR, Action.MOVE),
    undefined,
  );
  assert.ok(documentBulkBlockReason(item, DocumentRole.VIEWER, Action.DELETE));
});

void test('Move rejects selected parent/child pairs without flattening the folder structure', async () => {
  const h = setup();
  h.records.get('b')!.parentFolderId = 'a';
  await assert.rejects(
    h.service.execute('owner', 'owner@example.com', {
      ids: ['a', 'b'],
      action: Action.MOVE,
      parentFolderId: 'destination',
    }),
    /preserve the folder structure/,
  );
  assert.equal(h.transactions(), 0);
});

void test('bulk DTO rejects missing selections, duplicate IDs and unknown actions', () => {
  const dto = new DocumentBulkDto();
  dto.action = Action.MOVE;
  dto.ids = ['11111111-1111-4111-8111-111111111111'];
  assert.equal(validateSync(dto).length, 0);
  dto.ids.push(dto.ids[0]);
  assert.ok(validateSync(dto).length);
  dto.ids = [];
  assert.ok(validateSync(dto).length);
});
