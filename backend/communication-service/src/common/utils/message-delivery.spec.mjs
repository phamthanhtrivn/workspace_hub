import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const {
  reserveMessageDelivery,
  recordMessageDelivery,
} = require('./message-delivery.ts');
const { parseClientRequestId } = require('../dto/message-delivery.dto.ts');
const {
  MessageMutationService,
} = require('../../modules/message/message-mutation.service.ts');
const {
  MessagePublishingService,
} = require('../../modules/message/message-publishing.service.ts');
const {
  DirectMessageMutationService,
} = require('../../modules/direct-message/direct-message-mutation.service.ts');

function database() {
  const receipts = new Map(),
    locks = new Map();
  return {
    async run(action) {
      const releases = [],
        pending = [];
      const tx = {
        async $executeRaw(sql, ...args) {
          if (sql.join('?').includes('pg_advisory_xact_lock')) {
            const previous = locks.get(args[0]) ?? Promise.resolve();
            let release;
            locks.set(
              args[0],
              new Promise((resolve) => {
                release = resolve;
              }),
            );
            await previous;
            releases.push(release);
          } else pending.push(args);
        },
        async $queryRaw(_sql, senderId, requestId) {
          return receipts.has(`${senderId}:${requestId}`)
            ? [receipts.get(`${senderId}:${requestId}`)]
            : [];
        },
      };
      try {
        const result = await action(tx);
        for (const [senderId, requestId, fingerprint, messageId] of pending) {
          assert.ok(!receipts.has(`${senderId}:${requestId}`));
          receipts.set(`${senderId}:${requestId}`, { fingerprint, messageId });
        }
        return result;
      } finally {
        releases.forEach((release) => release());
      }
    },
  };
}

test('concurrent sends and replay use a single durable receipt; rollback leaves the request retryable', async () => {
  const db = database();
  const identity = {
    senderId: 'sender',
    requestId: randomUUID(),
    chatId: 'chat',
    chatType: 'CHANNEL',
    payload: { type: 'DOCUMENT', content: 'document' },
  };
  let inserts = 0;
  const send = () =>
    db.run(async (tx) => {
      const prior = await reserveMessageDelivery(tx, identity);
      if (prior) return prior;
      const messageId = `message-${++inserts}`;
      await recordMessageDelivery(tx, identity, messageId);
      return messageId;
    });
  assert.deepEqual(await Promise.all([send(), send(), send()]), [
    'message-1',
    'message-1',
    'message-1',
  ]);
  assert.equal(await send(), 'message-1');
  assert.equal(inserts, 1);
  for (const changes of [
    { chatId: 'other' },
    { chatType: 'DIRECT_MESSAGE' },
    { payload: { content: 'changed' } },
  ]) {
    await assert.rejects(
      db.run((tx) => reserveMessageDelivery(tx, { ...identity, ...changes })),
      /already used/,
    );
  }
  const failed = { ...identity, requestId: randomUUID() };
  await assert.rejects(
    db.run(async (tx) => {
      await reserveMessageDelivery(tx, failed);
      await recordMessageDelivery(tx, failed, 'rolled-back');
      throw Error('rollback');
    }),
  );
  assert.equal(
    await db.run((tx) => reserveMessageDelivery(tx, failed)),
    undefined,
  );
  assert.equal(
    await db.run((tx) =>
      reserveMessageDelivery(tx, { ...identity, senderId: 'other' }),
    ),
    undefined,
  );
});

test('request identifiers reject malformed boundary input and normalize UUIDs', () => {
  assert.equal(parseClientRequestId(undefined), undefined);
  const requestId = randomUUID();
  assert.equal(parseClientRequestId(requestId.toUpperCase()), requestId);
  for (const input of [null, '', 123, {}, 'not-a-uuid'])
    assert.throws(() => parseClientRequestId(input));
});

for (const direct of [false, true]) {
  test(`${direct ? 'DM' : 'Channel'} replay rechecks permission, rejects deleted messages, and produces no duplicate side effects`, async () => {
    const requestId = randomUUID();
    let allowed = true,
      deleted = false,
      permissionChecks = 0,
      receiptReads = 0;
    const unexpected = () => {
      throw Error('Duplicate side effect');
    };
    const message = {
      id: 'existing',
      senderId: 'sender',
      content: 'document',
      type: 'DOCUMENT',
      medias: [],
      ...(direct ? { conversationId: 'chat' } : { channelId: 'chat' }),
    };
    const db = database();
    await db.run((tx) =>
      recordMessageDelivery(
        tx,
        {
          senderId: 'sender',
          requestId,
          chatId: 'chat',
          chatType: direct ? 'DIRECT_MESSAGE' : 'CHANNEL',
          payload: { content: 'document', type: 'DOCUMENT', mentions: [] },
        },
        'existing',
      ),
    );
    const prisma = {
      $transaction: (run) =>
        db.run(async (tx) => {
          const read = tx.$queryRaw;
          tx.$queryRaw = (...args) => {
            receiptReads++;
            return read(...args);
          };
          Object.assign(tx, {
            channelMember: {
              findUnique: async () => {
                permissionChecks++;
                return allowed
                  ? {
                      channel: {
                        id: 'chat',
                        spaceId: 'space',
                        space: { createdBy: 'sender' },
                      },
                    }
                  : null;
              },
            },
            spaceMember: { findUnique: async () => ({ role: 'OWNER' }) },
            directConversationParticipant: {
              findUnique: async () => (allowed ? {} : null),
            },
            message: {
              findUnique: async () => ({
                ...message,
                deletedAt: deleted ? new Date() : null,
              }),
              create: unexpected,
            },
            directMessage: {
              findUnique: async () => ({
                ...message,
                deletedAt: deleted ? new Date() : null,
              }),
              create: unexpected,
            },
          });
          return run(tx);
        }),
    };
    const profiles = { attachSenderProfileToMessage: async (value) => value };
    const ai = { notify: unexpected, register: unexpected };
    const voice = { notify: unexpected, register: unexpected };
    let send;
    if (direct) {
      const service = new DirectMessageMutationService(
        {
          assertCanSend: async () => {
            permissionChecks++;
            if (!allowed) throw Error('Forbidden');
          },
        },
        {},
        prisma,
        ai,
        profiles,
        {},
        { mapDirectMessage: (value) => value },
        { publishDirectMessageCreated: unexpected },
        {},
        {},
        voice,
      );
      send = () =>
        service.createDirectMessage(
          'chat',
          'sender',
          'document',
          'DOCUMENT',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          requestId,
        );
    } else {
      const mutations = new MessageMutationService(
        prisma,
        {},
        ai,
        profiles,
        voice,
      );
      const service = new MessagePublishingService(
        { publishChannelMessageCreated: unexpected },
        mutations,
        {},
        {},
      );
      send = () =>
        service.createMessageAndPublish(
          'chat',
          'sender',
          'document',
          'DOCUMENT',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          requestId,
        );
    }
    assert.equal((await send()).id, 'existing');
    assert.equal(permissionChecks, 1);
    assert.equal(receiptReads, 1);
    deleted = true;
    await assert.rejects(send(), /no longer available/);
    allowed = false;
    await assert.rejects(send());
    assert.equal(receiptReads, 2, 'forbidden replay never reads the receipt');
  });
}
