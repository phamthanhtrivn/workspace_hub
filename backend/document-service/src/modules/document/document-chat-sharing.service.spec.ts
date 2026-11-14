import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import {
  SharePermission,
  type DocumentItem,
  type Prisma,
} from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import type { PrismaService } from '../../prisma/prisma.service';
import type { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import type { DocumentAccessService } from './document-access.service';
import { DocumentChatSharingService } from './document-chat-sharing.service';
import { DOCUMENT_CHAT_SHARING } from './types/document-chat-sharing.constants';
import { validateSync } from 'class-validator';
import { PrepareChatShareDto } from './dto/prepare-chat-share.dto';

function setup() {
  const item = {
    id: 'folder',
    ownerUserId: 'owner',
    projectId: null as string | null,
    isArchived: false,
  } as DocumentItem;
  const grants: Array<Prisma.DocumentShareCreateManyInput> = [];
  const roles = new Map<string, DocumentRole>();
  const missingProfiles = new Set<string>();
  let transactions = 0;
  let failCreate = false;
  const prisma = {
    $transaction: async (callback: (tx: unknown) => Promise<void>) => {
      transactions++;
      const pending = [...grants];
      await callback({
        documentShare: {
          findFirst: ({ where }: Prisma.DocumentShareFindFirstArgs) =>
            Promise.resolve(
              pending.find((grant) => {
                const or = where?.OR as Array<{
                  shareWithUserId?: string;
                  shareWithEmail?: string;
                }>;

                return or.some((condition) =>
                  condition.shareWithUserId
                    ? condition.shareWithUserId === grant.shareWithUserId
                    : condition.shareWithEmail === grant.shareWithEmail,
                );
              }),
            ),
          upsert: ({ create, update }: Prisma.DocumentShareUpsertArgs) => {
            assert.deepEqual(
              update,
              {},
              'never downgrade a concurrent Editor grant',
            );
            if (failCreate && pending.length)
              throw new Error('database unavailable');
            pending.push(create as Prisma.DocumentShareCreateManyInput);

            return Promise.resolve(create);
          },
        },
      });
      grants.splice(0, grants.length, ...pending);
    },
  } as unknown as PrismaService;
  const access = {
    getAccessContext: () => Promise.resolve({ item, role: DocumentRole.OWNER }),
    getPermissionRole: (_id: string, recipientId: string, email: string) => {
      assert.equal(email, `${recipientId}@example.com`);
      const role = roles.get(recipientId);
      if (!role) throw new ForbiddenException();

      return Promise.resolve(role);
    },
  } as unknown as DocumentAccessService;
  const profiles = {
    getProfilesByUserIds: (ids: string[]) =>
      Promise.resolve(
        new Map(
          ids
            .filter((id) => !missingProfiles.has(id))
            .map((id) => [id, { email: `${id}@example.com` }]),
        ),
      ),
  } as unknown as UserProfileSnapshotService;

  return {
    service: new DocumentChatSharingService(prisma, access, profiles, {
      publishForItem: () => Promise.resolve(),
    } as never),
    item,
    grants,
    roles,
    missingProfiles,
    transactions: () => transactions,
    failCreate: () => {
      failCreate = true;
    },
  };
}

void test('chat recipient DTO rejects empty, duplicate and invalid identities', () => {
  const dto = new PrepareChatShareDto();
  const recipient = '11111111-1111-4111-8111-111111111111';
  dto.recipientUserIds = [recipient];
  assert.equal(validateSync(dto).length, 0);
  for (const recipients of [[], [recipient, recipient], ['invalid-user-id']]) {
    dto.recipientUserIds = recipients;
    assert.ok(validateSync(dto).length > 0);
  }
});

void test('sharing a personal file/folder grants stable Viewer access once and excludes the sender', async () => {
  const h = setup();
  await h.service.prepareShare('owner', 'owner@example.com', 'folder', [
    'owner',
    'recipient',
    'recipient',
  ]);
  assert.equal(h.grants.length, 1);
  assert.deepEqual(h.grants[0], {
    documentItemId: 'folder',
    shareWithEmail: 'recipient@example.com',
    shareWithUserId: 'recipient',
    permission: SharePermission.VIEWER,
  });
  await h.service.prepareShare('owner', 'owner@example.com', 'folder', [
    'recipient',
  ]);
  assert.equal(h.grants.length, 1);
});

void test('inherited Editor access requires confirmation before adding stable Viewer grants', async () => {
  const h = setup();
  h.roles.set('editor', DocumentRole.EDITOR);
  h.roles.set('inherited-editor', DocumentRole.EDITOR);
  const recipients = [
    'editor',
    'inherited-editor',
    'viewer',
  ];
  const preview = await h.service.prepareShare('owner', 'owner@example.com', 'folder', recipients);
  assert.deepEqual(preview, { requiresConfirmation: true, inheritedEditorCount: 2 });
  assert.equal(h.grants.length, 0);
  assert.equal(h.transactions(), 0);
  await h.service.prepareShare('owner', 'owner@example.com', 'folder', recipients, true);
  assert.deepEqual(
    h.grants.map((grant) => grant.shareWithUserId),
    recipients,
  );
  assert.ok(h.grants.every(grant => grant.permission === SharePermission.VIEWER));
});

void test('direct Editor grants remain unchanged when shared to chat again', async () => {
  const h = setup();
  h.roles.set('editor', DocumentRole.EDITOR);
  const existing = { documentItemId: 'folder', shareWithUserId: 'editor', shareWithEmail: 'editor@example.com', permission: SharePermission.EDITOR };
  h.grants.push(existing);
  Object.assign(h.item, { shares: [existing] });
  assert.deepEqual(await h.service.prepareShare('owner', 'owner@example.com', 'folder', ['editor']), { requiresConfirmation: false, inheritedEditorCount: 0 });
  assert.deepEqual(h.grants, [existing]);
});

void test('non-owners cannot create grants; archived documents cannot be shared', async () => {
  const h = setup();
  await assert.rejects(
    h.service.prepareShare('editor', 'editor@example.com', 'folder', [
      'recipient',
    ]),
    { message: DOCUMENT_CHAT_SHARING.OWNER_REQUIRED },
  );
  h.item.isArchived = true;
  await assert.rejects(
    h.service.prepareShare('owner', 'owner@example.com', 'folder', [
      'recipient',
    ]),
    ForbiddenException,
  );
  assert.equal(h.transactions(), 0);
});

void test('missing recipient identities and database failures leave no partial grants', async () => {
  const h = setup();
  h.missingProfiles.add('missing');
  await assert.rejects(
    h.service.prepareShare('owner', 'owner@example.com', 'folder', [
      'recipient',
      'missing',
    ]),
  );
  assert.equal(h.transactions(), 0);
  h.failCreate();
  await assert.rejects(
    h.service.prepareShare('owner', 'owner@example.com', 'folder', [
      'one',
      'two',
    ]),
  );
  assert.equal(h.grants.length, 0);
});

void test('project sharing verifies every recipient membership and never creates email grants', async (context) => {
  const h = setup();
  h.item.projectId = 'project';
  const beforeUrl = process.env.PROJECT_SERVICE_URL;
  const beforeKey = process.env.DOCUMENT_TO_PROJECT_KEY;
  process.env.PROJECT_SERVICE_URL = 'http://project.test';
  process.env.DOCUMENT_TO_PROJECT_KEY = 'test-key';
  context.after(() => {
    if (beforeUrl === undefined) delete process.env.PROJECT_SERVICE_URL;
    else process.env.PROJECT_SERVICE_URL = beforeUrl;
    if (beforeKey === undefined) delete process.env.DOCUMENT_TO_PROJECT_KEY;
    else process.env.DOCUMENT_TO_PROJECT_KEY = beforeKey;
  });
  const checked: string[] = [];
  context.mock.method(
    globalThis,
    'fetch',
    (_url: unknown, init?: RequestInit) => {
      const { userId } = JSON.parse(init?.body as string) as { userId: string };
      checked.push(userId);

      return Promise.resolve(
        new Response(
          JSON.stringify({ owner: false, canEditDocuments: false }),
          { status: userId === 'outsider' ? 403 : 200 },
        ),
      );
    },
  );
  await h.service.prepareShare('owner', 'owner@example.com', 'folder', [
    'member',
  ]);
  await assert.rejects(
    h.service.prepareShare('owner', 'owner@example.com', 'folder', [
      'member',
      'outsider',
    ]),
    { message: DOCUMENT_CHAT_SHARING.PROJECT_ACCESS_REQUIRED },
  );
  assert.deepEqual(checked, ['member', 'member', 'outsider']);
  assert.equal(h.transactions(), 0);
  assert.equal(h.grants.length, 0);
});
