import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ItemType, SharePermission } from '@prisma/client';
import { DocumentSharingService } from './document-sharing.service';
import { DocumentShareNotificationService } from './document-share-notification.service';

function fixture(
  options: {
    type?: ItemType;
    denied?: boolean;
    wrongDocument?: boolean;
    failOutbox?: boolean;
    pending?: boolean;
  } = {},
) {
  const document = {
    id: 'document',
    name: 'Report',
    type: options.type ?? ItemType.FILE,
    sizeBytes: 123n,
    projectId: null,
    ownerUserId: 'owner',
  };
  const share = {
    id: 'share',
    documentItemId: options.wrongDocument ? 'other-document' : document.id,
    shareWithUserId: options.pending ? null : 'recipient',
    shareWithEmail: 'recipient@example.test',
    permission: SharePermission.VIEWER,
  };
  const payloads: Array<Record<string, unknown>> = [];
  const state = { deleted: false, transactions: 0, events: 0 };
  const tx = {
    $queryRaw: () => Promise.resolve([]),
    $executeRaw: (_query: TemplateStringsArray, _id: string, json: string) => {
      if (options.failOutbox)
        return Promise.reject(new Error('Outbox unavailable'));
      payloads.push(JSON.parse(json) as Record<string, unknown>);

      return Promise.resolve(1);
    },
    documentShare: {
      findUnique: () => Promise.resolve(state.deleted ? null : share),
      delete: () => {
        state.deleted = true;

        return Promise.resolve(share);
      },
    },
    userProfileSnapshot: {
      findUnique: () => Promise.resolve({ fullName: 'Owner' }),
      findFirst: () => Promise.resolve({ userId: 'recipient' }),
    },
  };
  const dependencies = [
    {
      $transaction: async (
        operation: (database: typeof tx) => Promise<unknown>,
      ) => {
        state.transactions++;
        const deletedBefore = state.deleted;
        const payloadCount = payloads.length;
        try {
          return await operation(tx);
        } catch (error) {
          state.deleted = deletedBefore;
          payloads.splice(payloadCount);
          throw error;
        }
      },
    },
    {},
    {
      checkPersonalOwnerFeature: () =>
        options.denied
          ? Promise.reject(new ForbiddenException())
          : Promise.resolve(document),
    },
    {
      publishProjectDocumentEvent: () => {
        state.events++;

        return Promise.resolve();
      },
    },
    new DocumentShareNotificationService(),
    { publishForItem: () => Promise.resolve() },
  ] as unknown as ConstructorParameters<typeof DocumentSharingService>;

  return {
    service: new DocumentSharingService(...dependencies),
    state,
    payloads,
  };
}

for (const type of [ItemType.FILE, ItemType.FOLDER]) {
  void test(`${type} share removal notifies the bound recipient once with resource details and no document link`, async () => {
    const context = fixture({ type });
    await context.service.removeShare(
      'owner',
      'owner@example.test',
      'document',
      'share',
    );
    assert.equal(context.state.deleted, true);
    assert.equal(context.state.transactions, 1);
    assert.equal(context.payloads.length, 1);
    const payload = context.payloads[0];
    assert.equal(payload.type, 'DOCUMENT_SHARE_REMOVED');
    assert.equal(payload.recipientId, 'recipient');
    assert.equal(payload.senderName, 'Owner');
    assert.equal(payload.link, undefined);
    const metadata = payload.metadata as Record<string, unknown>;
    assert.equal(metadata.documentName, 'Report');
    assert.equal(metadata.itemType, type);
    assert.equal(metadata.previousPermission, 'VIEWER');
    assert.ok(metadata.removedAt);
    await assert.rejects(
      context.service.removeShare(
        'owner',
        'owner@example.test',
        'document',
        'share',
      ),
      NotFoundException,
    );
    assert.equal(context.payloads.length, 1);
  });
}

void test('share revocation rejects non-owners and grants belonging to a different document', async () => {
  const denied = fixture({ denied: true });
  await assert.rejects(
    denied.service.removeShare(
      'other',
      'other@example.test',
      'document',
      'share',
    ),
    ForbiddenException,
  );
  assert.equal(denied.state.transactions, 0);
  const wrong = fixture({ wrongDocument: true });
  await assert.rejects(
    wrong.service.removeShare(
      'owner',
      'owner@example.test',
      'document',
      'share',
    ),
    NotFoundException,
  );
  assert.equal(wrong.state.deleted, false);
  assert.equal(wrong.payloads.length, 0);
});

void test('notification persistence failure rolls back revocation and prevents publishing a document event', async () => {
  const context = fixture({ failOutbox: true });
  await assert.rejects(
    context.service.removeShare(
      'owner',
      'owner@example.test',
      'document',
      'share',
    ),
    /Outbox unavailable/,
  );
  assert.equal(context.state.deleted, false);
  assert.equal(context.state.events, 0);
  assert.equal(context.payloads.length, 0);
});

void test('an email-only grant resolves its registered recipient when revoked', async () => {
  const context = fixture({ pending: true });
  await context.service.removeShare(
    'owner',
    'owner@example.test',
    'document',
    'share',
  );
  assert.equal(context.payloads[0].recipientId, 'recipient');
});
