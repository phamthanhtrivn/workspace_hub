import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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

function setup() {
  const item = (id: string) =>
    ({
      id,
      name: `${id}.txt`,
      ownerUserId: 'owner',
      projectId: null,
      parentFolderId: 'source',
      isArchived: false,
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
  let deleted: string[] = [];
  const prisma = {
    documentItem: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(records.get(where.id) ?? null),
    },
    $transaction: async (callback: (tx: unknown) => Promise<void>) => {
      transactions++;
      const pending = new Map(
        [...records].map(([id, record]) => [id, { ...record }]),
      );
      const pendingStars = new Set(stars);
      await callback({
        documentItem: {
          update: ({ where, data }: Prisma.DocumentItemUpdateArgs) => {
            if (where.id === failId) throw new Error('database write failed');
            const record = pending.get(where.id!);
            assert.ok(record);
            Object.assign(record, data);

            return Promise.resolve(pending.get(where.id!));
          },
        },
        userStarredDocument: {
          upsert: ({ create }: Prisma.UserStarredDocumentUpsertArgs) => {
            pendingStars.add(create.documentItemId as string);

            return Promise.resolve(create);
          },
          deleteMany: ({ where }: Prisma.UserStarredDocumentDeleteManyArgs) => {
            pendingStars.delete(where?.documentItemId as string);

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
    lockAvailableName: () => Promise.resolve(),
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
  h.roles.set('b', DocumentRole.VIEWER);
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
