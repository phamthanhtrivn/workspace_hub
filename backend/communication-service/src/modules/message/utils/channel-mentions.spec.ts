import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import { resolveChannelMentions } from './channel-mentions';

const sender = '00000000-0000-4000-8000-000000000001';
const member = '00000000-0000-4000-8000-000000000002';
const spaceOnly = '00000000-0000-4000-8000-000000000003';
const departed = '00000000-0000-4000-8000-000000000004';
const outsider = '00000000-0000-4000-8000-000000000005';

function fixture(isDefault: boolean) {
  const reads: string[] = [];
  const tx = {
    spaceMember: {
      findMany: ({
        where,
      }: {
        where: { spaceId: string; userId: { not: string } };
      }) => {
        assert.equal(where.spaceId, 'space');
        assert.equal(where.userId.not, sender);
        reads.push('space');

        return Promise.resolve([{ userId: member }, { userId: spaceOnly }]);
      },
    },
    channelMember: {
      findMany: ({
        where,
      }: {
        where: { channelId: string; userId: { in: string[] } };
      }) => {
        reads.push('channel');
        assert.equal(where.channelId, 'channel');

        return Promise.resolve(
          [member, member, sender, departed]
            .filter((userId) => where.userId.in.includes(userId))
            .map((userId) => ({ userId })),
        );
      },
    },
  } as unknown as Prisma.TransactionClient;
  const channel = { id: 'channel', spaceId: 'space', isDefault };

  return {
    reads,
    resolve: (content: string, mentions?: string[]) =>
      resolveChannelMentions(tx, channel, sender, content, mentions),
  };
}

void test('General @All resolves accepted Space members, without sender or duplicate personal mentions', async () => {
  const { resolve, reads } = fixture(true);
  assert.deepEqual(
    await resolve('Hello @All @all!', [
      'all',
      member,
      member,
      sender,
      outsider,
    ]),
    {
      content: 'Hello @All @All!',
      mentions: [member, spaceOnly],
    },
  );
  assert.deepEqual(reads, ['space']);
});

void test('non-default @All is saved as @Channel and only current channel members are mentioned', async () => {
  const { resolve } = fixture(false);
  for (const content of ['Hello @All', 'Hello @Channel', 'Hello @aLl']) {
    assert.deepEqual(
      await resolve(content, [
        'all',
        'channel',
        member,
        spaceOnly,
        departed,
        outsider,
      ]),
      {
        content: 'Hello @Channel',
        mentions: [member],
      },
    );
  }
});

void test('General has one canonical group even if @Channel is typed manually', async () => {
  assert.deepEqual(await fixture(true).resolve('@Channel @All'), {
    content: '@All @All',
    mentions: [member, spaceOnly],
  });
});

void test('forged or deleted group IDs without an authored group token cannot notify the group', async () => {
  const { resolve, reads } = fixture(false);
  assert.deepEqual(
    await resolve('Hello', ['all', 'channel', 'ai', 'invalid']),
    { content: 'Hello', mentions: [] },
  );
  assert.deepEqual(reads, []);
});

void test('personal mentions are deduplicated and limited to current Space/channel membership', async () => {
  assert.deepEqual(
    await fixture(false).resolve('Hello', [
      member,
      member,
      sender,
      spaceOnly,
      departed,
      outsider,
    ]),
    {
      content: 'Hello',
      mentions: [member],
    },
  );
});

void test('code, quotes, emails and longer names do not activate or rewrite group mentions', async () => {
  for (const content of [
    '`@All`',
    '```\n@All\n```',
    '> @All',
    'hi@All.example',
    '@Allison',
    '@ChannelTeam',
    '\\@All',
  ]) {
    assert.deepEqual(
      await fixture(false).resolve(content, ['all', 'channel']),
      { content, mentions: [] },
    );
  }
  assert.deepEqual(await fixture(false).resolve('Explain `@All` please @All'), {
    content: 'Explain `@All` please @Channel',
    mentions: [member],
  });
});

void test('malformed client mention arrays are rejected before querying membership', async () => {
  for (const mentions of ['all', [1], null, {}]) {
    const { resolve, reads } = fixture(false);
    await assert.rejects(
      resolve('@All', mentions as unknown as string[]),
      /Invalid data/,
    );
    assert.deepEqual(reads, []);
  }
});
