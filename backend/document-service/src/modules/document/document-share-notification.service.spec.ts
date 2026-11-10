import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type DocumentItem,
  type Prisma,
  SharePermission,
} from '@prisma/client';
import { DocumentShareNotificationService } from './document-share-notification.service';

function fixture() {
  const payloads: Array<Record<string, unknown>> = [];
  const tx = {
    userProfileSnapshot: {
      findUnique: () =>
        Promise.resolve({
          fullName: 'Alex',
          email: 'alex@example.invalid',
        }),
    },
    $executeRaw: (
      _sql: TemplateStringsArray,
      _deliveryId: string,
      json: string,
    ) => {
      payloads.push(JSON.parse(json) as Record<string, unknown>);

      return Promise.resolve(1);
    },
  } as unknown as Prisma.TransactionClient;
  const item = {
    id: 'document',
    name: 'Report',
    type: 'FILE',
    sizeBytes: 123n,
    mimeType: 'application/pdf',
    projectId: null,
    ownerUserId: 'owner',
  } as DocumentItem;

  return {
    payloads,
    tx,
    item,
    service: new DocumentShareNotificationService(),
  };
}
void test('direct file sharing persists recipient, sender, file details, permission and a deduplicated delivery ID', async () => {
  const f = fixture();
  await f.service.enqueue(
    f.tx,
    f.item,
    'owner',
    'recipient',
    SharePermission.VIEWER,
  );
  assert.equal(f.payloads[0].type, 'DOCUMENT_SHARED');
  assert.equal(f.payloads[0].recipientId, 'recipient');
  assert.equal(f.payloads[0].senderName, 'Alex');
  const metadata = f.payloads[0].metadata as Record<string, unknown>;
  assert.equal(metadata.documentName, 'Report');
  assert.equal(metadata.sizeBytes, '123');
  assert.equal(metadata.permission, 'VIEWER');
  assert.ok(metadata.deliveryId);
  assert.match(String(f.payloads[0].link), /documentId=document/);
});
void test('folder sharing creates one folder notification without walking inherited children', async () => {
  const f = fixture();
  f.item.type = 'FOLDER';
  await f.service.enqueue(
    f.tx,
    f.item,
    'owner',
    'recipient',
    SharePermission.EDITOR,
  );
  assert.equal(f.payloads.length, 1);
  assert.match(String(f.payloads[0].link), /folderId=document/);
});
void test('permission changes notify once; duplicate shares, project files, self shares and unresolved identities do not', async () => {
  const f = fixture();
  await f.service.enqueue(
    f.tx,
    f.item,
    'owner',
    'recipient',
    SharePermission.EDITOR,
    SharePermission.VIEWER,
  );
  assert.equal(f.payloads[0].type, 'DOCUMENT_PERMISSION_UPDATED');
  await f.service.enqueue(
    f.tx,
    f.item,
    'owner',
    'recipient',
    SharePermission.EDITOR,
    SharePermission.EDITOR,
  );
  await f.service.enqueue(
    f.tx,
    f.item,
    'owner',
    'owner',
    SharePermission.EDITOR,
  );
  await f.service.enqueue(f.tx, f.item, 'owner', null, SharePermission.EDITOR);
  f.item.projectId = 'project';
  await f.service.enqueue(
    f.tx,
    f.item,
    'owner',
    'recipient',
    SharePermission.EDITOR,
  );
  assert.equal(f.payloads.length, 1);
});
