import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { ProjectAccessService } from '../project/project-access.service';
import type { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import type { ProjectService } from '../project/project.service';
import type { NotificationOutboxService } from '../notification-outbox/notification-outbox.service';
import type { ProjectNotification } from '../../common/adapters/project-communication.port';
import { MemberService } from './member.service';
import type { UpdateMemberPermissionsDto } from './dto/update-member-permissions.dto';

function fixture() {
  const permissions: UpdateMemberPermissionsDto = {
    canCreateTask: false,
    canEditOwnTask: false,
    canEditOthersTask: false,
    canManageMembers: false,
    canManageLabels: false,
    canEditDocuments: false,
  };
  const member = {
    id: 'member',
    userId: 'recipient',
    projectId: 'project',
    role: 'MEMBER',
    status: 'ACTIVE',
    version: 1,
    ...permissions,
  };
  const sent: ProjectNotification[] = [];
  const unassigned: unknown[] = [];
  let denied = false;
  const tx = {
    project: {
      findUniqueOrThrow: async () => ({ id: 'project', name: 'Workspace', icon: '🎯', color: '#22396f' }),
    },
    projectMember: {
      findUnique: async () => member,
      update: async ({ data }: { data: object }) => ({ ...member, ...data }),
    },
    taskAssignee: {
      deleteMany: async (query: unknown) => {
        unassigned.push(query);

        return { count: 2 };
      },
    },
    projectAccessSyncJob: { upsert: async () => ({}) },
  };
  const prisma = {
    projectMember: tx.projectMember,
    $transaction: async (callback: (database: typeof tx) => Promise<unknown>) =>
      callback(tx),
  } as unknown as PrismaService;
  const check = async () => {
    if (denied) throw new ForbiddenException();

    return { id: 'project', name: 'Workspace', icon: '🎯', color: '#22396f' };
  };
  const access = {
    requireOwnerWriteAccess: check,
    requireCanManageMembers: check,
  } as unknown as ProjectAccessService;
  const profiles = {
    getProfileByUserId: async () => null,
  } as unknown as UserProfileSnapshotService;
  const notifications = {
    enqueueNotification: async (
      event: ProjectNotification,
      database: unknown,
    ) => {
      assert.equal(database, tx);
      sent.push(event);
    },
  } as unknown as NotificationOutboxService;

  return {
    permissions,
    sent,
    unassigned,
    deny: () => {
      denied = true;
    },
    service: new MemberService(
      prisma,
      access,
      profiles,
      {} as ProjectService,
      notifications,
    ),
  };
}
test('permission updates notify the affected member with only actual before/after changes', async () => {
  const f = fixture();
  await f.service.updatePermissions('owner', 'project', 'recipient', {
    ...f.permissions,
    canEditDocuments: true,
  });
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].recipientId, 'recipient');
  assert.equal(f.sent[0].type, 'PROJECT_PERMISSIONS_UPDATED');
  assert.equal(f.sent[0].metadata?.projectIcon, '🎯');
  assert.equal(f.sent[0].metadata?.projectColor, '#22396f');
  assert.deepEqual(f.sent[0].metadata?.changes, [
    {
      field: 'canEditDocuments',
      label: 'Edit documents',
      before: false,
      after: true,
    },
  ]);
});
test('unchanged permissions and unauthorized updates never create notifications', async () => {
  const f = fixture();
  await f.service.updatePermissions(
    'owner',
    'project',
    'recipient',
    f.permissions,
  );
  f.deny();
  await assert.rejects(
    f.service.updatePermissions('actor', 'project', 'recipient', {
      ...f.permissions,
      canManageMembers: true,
    }),
    ForbiddenException,
  );
  assert.equal(f.sent.length, 0);
});
test('removing a member clears task assignments and atomically enqueues the project removal notification', async () => {
  const f = fixture();
  await f.service.remove('owner', 'project', 'recipient');
  assert.deepEqual(f.unassigned, [
    { where: { projectId: 'project', userId: 'recipient' } },
  ]);
  assert.equal(f.sent[0].type, 'PROJECT_MEMBER_REMOVED');
  assert.equal(f.sent[0].recipientId, 'recipient');
  assert.equal(f.sent[0].link, undefined);
  assert.equal(f.sent[0].metadata?.projectName, 'Workspace');
  assert.equal(f.sent[0].metadata?.projectIcon, '🎯');
  assert.equal(f.sent[0].metadata?.projectColor, '#22396f');
});
