import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ItemType, SharePermission, type Prisma } from '@prisma/client';
import { DocumentSharingService } from './document-sharing.service';
import { DocumentShareNotificationService } from './document-share-notification.service';

function fixture(type: ItemType, previousRecipient?: string) {
  const snapshots = [
    { userId: 'deleted-account', syncedAt: new Date('2026-11-06') },
    { userId: 'current-account', syncedAt: new Date('2026-11-08') },
  ];
  const item = {
    id: 'document',
    name: 'Report',
    type,
    sizeBytes: 123n,
    projectId: null,
    ownerUserId: 'owner',
    ownerEmail: 'owner@example.test',
  };
  const previous = previousRecipient
    ? { shareWithUserId: previousRecipient, permission: SharePermission.VIEWER }
    : null;
  const payloads: Array<Record<string, unknown>> = [];
  const tx = {
    $queryRaw: () => Promise.resolve([]),
    $executeRaw: (
      _query: TemplateStringsArray,
      _id: string,
      payload: string,
    ) => {
      payloads.push(JSON.parse(payload) as Record<string, unknown>);

      return Promise.resolve(1);
    },
    documentShare: {
      findUnique: () => Promise.resolve(previous),
      upsert: ({ create, update }: Prisma.DocumentShareUpsertArgs) =>
        Promise.resolve({
          ...(previous ? { ...previous, ...update } : create),
        }),
    },
    userProfileSnapshot: {
      findFirst: (query: Prisma.UserProfileSnapshotFindFirstArgs) => {
        const profiles = [...snapshots];
        const order = Array.isArray(query.orderBy)
          ? query.orderBy[0]
          : query.orderBy;
        if (order?.syncedAt === 'desc')
          profiles.sort(
            (left, right) => right.syncedAt.getTime() - left.syncedAt.getTime(),
          );

        return Promise.resolve(profiles[0]);
      },
      findUnique: () => Promise.resolve({ fullName: 'Owner' }),
    },
  };
  const dependencies = [
    {
      $transaction: async (
        operation: (database: typeof tx) => Promise<unknown>,
      ) => operation(tx),
    },
    {},
    { checkPersonalOwnerFeature: () => Promise.resolve(item) },
    { publishProjectDocumentEvent: () => Promise.resolve(undefined) },
    new DocumentShareNotificationService(),
    { publishForItem: () => Promise.resolve() },
  ] as unknown as ConstructorParameters<typeof DocumentSharingService>;

  return { service: new DocumentSharingService(...dependencies), payloads };
}

for (const type of [ItemType.FILE, ItemType.FOLDER]) {
  void test(`${type} sharing resolves duplicate email snapshots to the latest account for both the grant and notification`, async () => {
    const context = fixture(type);
    const share = await context.service.addShare(
      'owner',
      'owner@example.test',
      'document',
      'recipient@example.test',
      SharePermission.VIEWER,
    );
    assert.equal(share.shareWithUserId, 'current-account');
    assert.equal(context.payloads[0]?.recipientId, 'current-account');
    assert.equal(context.payloads[0]?.type, 'DOCUMENT_SHARED');
  });
}

void test('an owner re-sharing to a corrected recipient creates a new share notification even with the same permission', async () => {
  const context = fixture(ItemType.FILE, 'deleted-account');
  const share = await context.service.addShare(
    'owner',
    'owner@example.test',
    'document',
    'recipient@example.test',
    SharePermission.VIEWER,
  );
  assert.equal(share.shareWithUserId, 'current-account');
  assert.equal(context.payloads[0]?.recipientId, 'current-account');
  assert.equal(context.payloads[0]?.type, 'DOCUMENT_SHARED');
});

void test('repeating the same grant for the same recipient stays silent', async () => {
  const context = fixture(ItemType.FILE, 'current-account');
  await context.service.addShare(
    'owner',
    'owner@example.test',
    'document',
    'recipient@example.test',
    SharePermission.VIEWER,
  );
  assert.equal(context.payloads.length, 0);
});

void test('batch sharing normalizes duplicate emails and resolves the current account once', async () => {
  const context = fixture(ItemType.FOLDER);
  const shares = await context.service.addSharesBatch(
    'owner',
    'owner@example.test',
    'document',
    [' Recipient@example.test ', 'recipient@example.test'],
    SharePermission.VIEWER,
  );
  assert.equal(shares.length, 1);
  assert.equal(shares[0].shareWithUserId, 'current-account');
  assert.equal(context.payloads.length, 1);
  assert.equal(context.payloads[0].recipientId, 'current-account');
});
