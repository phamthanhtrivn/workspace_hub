import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { MessageMutationService } = require('./message-mutation.service.ts');
const { MessagePublishingService } = require('./message-publishing.service.ts');

const sender = '00000000-0000-4000-8000-000000000001';
const member = '00000000-0000-4000-8000-000000000002';
const spaceOnly = '00000000-0000-4000-8000-000000000003';

function fixture({
  isDefault = false,
  visibility = 'PUBLIC',
  authorized = true,
  rollback = false,
} = {}) {
  const order = [];
  const saved = [];
  const published = [];
  const tx = {
    channelMember: {
      findUnique: async () =>
        authorized
          ? {
              channel: {
                id: 'channel',
                spaceId: 'space',
                isDefault,
                visibility,
                ownerId: sender,
                space: { createdBy: sender },
              },
            }
          : null,
      findMany: async () => [{ userId: member }],
      update: async () => {},
    },
    spaceMember: {
      findUnique: async () => ({ role: 'OWNER' }),
      findMany: async () => [{ userId: member }, { userId: spaceOnly }],
    },
    message: {
      findUnique: async () => ({
        id: 'thread',
        channelId: 'channel',
        senderId: member,
      }),
      update: async () => {},
      create: async ({ data }) => {
        saved.push(data);
        return { ...data, id: 'message', medias: [] };
      },
    },
    threadFollower: { findUnique: async () => ({}), create: async () => {} },
    channel: { update: async () => {} },
  };
  const prisma = {
    $transaction: async (run) => {
      const result = await run(tx);
      if (rollback) throw Error('rolled back');
      order.push('committed');
      return result;
    },
  };
  const ai = {
    register: async (message) => {
      order.push(message.content);
    },
    notify: () => {
      order.push('wake');
    },
  };
  const mutations = new MessageMutationService(
    prisma,
    {},
    ai,
    { attachSenderProfileToMessage: async (message) => message },
    { register: async () => {}, notify() {} },
  );
  const publishing = new MessagePublishingService(
    {
      publishChannelMessageCreated: async (_channelId, message) => {
        assert.ok(order.includes('committed'));
        published.push(message);
      },
    },
    mutations,
    { getThreadFollowers: async () => ['follower'] },
    {},
  );
  return {
    order,
    saved,
    published,
    send: (threadId) =>
      publishing.createMessageAndPublish(
        'channel',
        sender,
        'Please @All and @Channel check',
        'TEXT',
        undefined,
        undefined,
        undefined,
        threadId,
        ['all', 'channel', sender, member, spaceOnly],
      ),
  };
}

test('canonical group text and server recipients are saved/published for normal messages and thread replies', async () => {
  for (const isDefault of [true, false]) {
    for (const visibility of ['PUBLIC', 'PRIVATE']) {
      for (const threadId of [undefined, 'thread']) {
        const subject = fixture({ isDefault, visibility });
        const response = await subject.send(threadId);
        const label = isDefault ? '@All' : '@Channel';
        assert.equal(
          subject.saved[0].content,
          `Please ${label} and ${label} check`,
        );
        assert.equal(
          subject.order[0],
          subject.saved[0].content,
          'AI sees the canonical message inside the same transaction',
        );
        assert.equal(response.content, subject.saved[0].content);
        assert.deepEqual(
          response.mentions,
          isDefault ? [member, spaceOnly] : [member],
        );
        assert.deepEqual(subject.published, [response]);
        assert.equal(response.threadParentId, threadId);
      }
    }
  }
});

test('denied membership and a rolled-back send publish no group mentions', async () => {
  const denied = fixture({ authorized: false });
  await assert.rejects(denied.send(), /not a member/);
  assert.deepEqual(denied.saved, []);
  assert.deepEqual(denied.published, []);
  const rolledBack = fixture({ rollback: true });
  await assert.rejects(rolledBack.send(), /rolled back/);
  assert.deepEqual(rolledBack.published, []);
  assert.ok(!rolledBack.order.includes('wake'));
});
