import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import { createProjectRemovalMessages } from './project-membership-system-messages';

void test('project removals persist a named system message in the default channel in the same transaction', async () => {
  const saved: Array<{ channelId: string; type: string; content: string }> = [];
  const tx = {
    userProfileSnapshot: {
      findMany: () =>
        Promise.resolve([{ userId: 'removed', fullName: 'Alex' }]),
    },
    message: {
      create: ({ data }: { data: (typeof saved)[number] }) => {
        saved.push(data);

        return Promise.resolve({ id: 'message', ...data });
      },
    },
    channel: { update: () => Promise.resolve({}) },
  } as unknown as Prisma.TransactionClient;
  const result = await createProjectRemovalMessages(tx, 'general', 'owner', [
    'removed',
  ]);
  assert.equal(result.length, 1);
  assert.equal(saved[0].channelId, 'general');
  assert.equal(saved[0].type, 'SYSTEM');
  assert.match(saved[0].content, /Alex was removed from this project/);
  assert.equal(
    (await createProjectRemovalMessages(tx, 'general', 'owner', [])).length,
    0,
  );
});
