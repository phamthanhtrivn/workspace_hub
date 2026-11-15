import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ConversationAiService } = require('./conversation-ai.service.ts');
const {
  MessageMutationService,
} = require('../message/message-mutation.service.ts');
const {
  DirectMessageMutationService,
} = require('../direct-message/direct-message-mutation.service.ts');

test('channel, DM and thread registration creates one request per message despite repeated mentions', async () => {
  const previous = process.env.CONVERSATION_AI_ENABLED;
  process.env.CONVERSATION_AI_ENABLED = 'true';
  try {
    for (const chatType of ['CHANNEL', 'DIRECT_MESSAGE']) {
      for (const threadParentId of [null, 'thread']) {
        const statements = [];
        const tx = {
          $queryRaw: async () => [{ count: 0n }],
          $executeRaw: async (sql, ...values) => {
            statements.push({ sql: sql.join('?'), values });
          },
        };
        const service = new ConversationAiService({}, {});
        const message = {
          id: 'new-message',
          type: 'TEXT',
          content: 'Help @AI Bot explain @ai',
          threadParentId,
        };
        await service.register(message, 'sender', 'chat', chatType, tx);
        const inserts = statements.filter((statement) =>
          statement.sql.includes('INSERT INTO conversation_ai_requests'),
        );
        assert.equal(inserts.length, 1);
        assert.equal(inserts[0].values[0], message.id);
        assert.equal(inserts[0].values[3], chatType);
        assert.match(inserts[0].sql, /ON CONFLICT DO NOTHING/);
        let wakes = 0;
        service.wake = () => wakes++;
        service.notify(message);
        service.notify({ ...message, content: '`@AI Bot`' });
        assert.equal(wakes, 1);
        statements.length = 0;
        await service.register(
          { ...message, content: '> @AI Bot quoted only' },
          'sender',
          'chat',
          chatType,
          tx,
        );
        await service.register(
          { ...message, type: 'AI' },
          'sender',
          'chat',
          chatType,
          tx,
        );
        assert.equal(statements.length, 0);
        process.env.CONVERSATION_AI_ENABLED = 'false';
        await service.register(message, 'sender', 'chat', chatType, tx);
        assert.equal(statements.length, 0);
        process.env.CONVERSATION_AI_ENABLED = 'true';
      }
    }
  } finally {
    if (previous === undefined) delete process.env.CONVERSATION_AI_ENABLED;
    else process.env.CONVERSATION_AI_ENABLED = previous;
  }
});

test('adding a mention by editing a channel/DM message or thread reply does not register or dispatch AI', async () => {
  for (const threadParentId of [null, 'thread']) {
    let aiCalls = 0;
    const ai = { register: () => aiCalls++, notify: () => aiCalls++ };
    const original = {
      id: 'existing',
      senderId: 'sender',
      type: 'TEXT',
      content: 'Original',
      createdAt: new Date(),
      threadParentId,
    };
    const updates = [];
    const messages = {
      findUnique: async () => original,
      update: async ({ data }) => {
        updates.push(data);
        return { ...original, ...data };
      },
    };
    const prisma = { message: messages, directMessage: messages };
    const channel = new MessageMutationService(prisma, {}, ai, {}, {});
    const direct = new DirectMessageMutationService(
      {},
      {},
      prisma,
      ai,
      {},
      {},
      { mapDirectMessage: (message) => message },
      { publishDirectMessageUpdate: async () => {} },
      { getOwnedDirectMessage: async () => original, assertWithin24Hours() {} },
      {},
      {},
    );
    await channel.editMessage(original.id, 'Please @AI Bot explain', 'sender');
    await direct.editDirectMessage(
      original.id,
      'Please @AI Bot explain',
      'sender',
    );
    assert.equal(updates.length, 2);
    assert.ok(
      updates.every(
        (update) => update.edited && update.content.includes('@AI Bot'),
      ),
    );
    assert.equal(aiCalls, 0);
  }
});
