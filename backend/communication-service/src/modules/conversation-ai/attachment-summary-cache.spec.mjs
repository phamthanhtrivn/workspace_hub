import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const { reserveAttachmentSummary } = require('./attachment-summary-cache.ts');
const { ConversationAiService } = require('./conversation-ai.service.ts');
const { MessageMutationService } = require('../message/message-mutation.service.ts');
const { MessagePublishingService } = require('../message/message-publishing.service.ts');
const { DirectMessageMutationService } = require('../direct-message/direct-message-mutation.service.ts');

function database() {
  const records = [],
    locks = new Map();
  async function run(identity, options) {
    const releases = [];
    const tx = {
      $executeRaw: async (sql, value) => {
        assert.match(sql.join('?'), /pg_advisory_xact_lock/);
        const previous = locks.get(value) ?? Promise.resolve();
        let release;
        locks.set(
          value,
          new Promise((resolve) => {
            release = resolve;
          }),
        );
        await previous;
        releases.push(release);
      },
      $queryRaw: async (sql, value) =>
        sql.join('?').includes('summary_action_id')
          ? records.filter((row) => row.actionId === value)
          : records
              .filter(
                (row) =>
                  row.summary_key === value &&
                  ['QUEUED', 'RUNNING', 'COMPLETED'].includes(row.status),
              )
              .slice(-1),
    };
    try {
      const result = await reserveAttachmentSummary(tx, identity, options);
      if (result.existing) return { reused: true, record: result.existing };
      const record = {
        id: randomUUID(),
        status: 'QUEUED',
        summary_key: result.key,
        actionId: options?.actionId,
      };
      records.push(record);
      return { reused: false, record };
    } finally {
      releases.reverse().forEach((release) => release());
    }
  }
  return { run, records };
}

test('concurrent components/tabs share one queued summary, including concurrent Generate again', async () => {
  const db = database(),
    identity = ['CHANNEL', 'chat', 'thread', 'file-version', 'question'];
  const pair = await Promise.all([
    db.run(identity, { actionId: randomUUID() }),
    db.run(identity, { actionId: randomUUID() }),
  ]);
  assert.equal(db.records.length, 1);
  assert.equal(pair.filter((result) => result.reused).length, 1);
  db.records[0].status = 'COMPLETED';
  assert.equal((await db.run(identity)).reused, true);
  const regenerated = await Promise.all([
    db.run(identity, { regenerate: true, actionId: randomUUID() }),
    db.run(identity, { regenerate: true, actionId: randomUUID() }),
  ]);
  assert.equal(db.records.length, 2);
  assert.equal(regenerated.filter((result) => result.reused).length, 1);
});

test('file version, conversation, thread and question are separate cache identities; failures can be retried', async () => {
  const db = database();
  const identity = ['CHANNEL', 'chat', 'thread', 'version1', 'question'];
  await db.run(identity);
  for (let index = 0; index < identity.length; index++) {
    const different = [...identity];
    different[index] += '-different';
    assert.equal((await db.run(different)).reused, false);
  }
  db.records[0].status = 'FAILED';
  assert.equal((await db.run(identity)).reused, false);
});

test('replaying an explicit regeneration action never generates twice, even after completion', async () => {
  const db = database(),
    identity = ['chat', 'file'],
    options = { regenerate: true, actionId: randomUUID() };
  const original = await db.run(identity, options);
  original.record.status = 'COMPLETED';
  const repeated = await db.run(identity, options);
  assert.equal(repeated.record.id, original.record.id);
  assert.equal(db.records.length, 1);
  await assert.rejects(
    db.run(['different-chat', 'file'], options),
    /another file or conversation/,
  );
  await assert.rejects(
    db.run(identity, { regenerate: true }),
    /Invalid summary request/,
  );
});

test('a completed cached reply is reused only while its source and reply remain available', async () => {
  const previous = process.env.CONVERSATION_AI_ENABLED;
  process.env.CONVERSATION_AI_ENABLED = 'true';
  try {
    const id = randomUUID(),
      original = {
        id,
        content: '@AI Bot Summarize',
        recalled: false,
        deletedAt: null,
        medias: [],
      };
    const reply = {
      id: randomUUID(),
      content: 'Saved summary',
      recalled: false,
      deletedAt: null,
    };
    const service = new ConversationAiService({}, {});
    service.summaryMedia = async () => ({
      id: 'file',
      sizeBytes: 10,
      s3Key: 'chat-media/chat/file.txt',
    });
    service.assertSummaryMedia = () => {};
    const tx = {
      $executeRaw: async () => {},
      $queryRaw: async () => [{ id, status: 'COMPLETED' }],
      message: {
        findUnique: async ({ where }) => (where.id === id ? original : reply),
      },
    };
    const first = await service.prepareAttachmentSummary(
      tx,
      'user',
      'chat',
      'CHANNEL',
      null,
      'file',
      '@AI Bot Summarize',
    );
    assert.equal(first.reused.summary.reply.content, 'Saved summary');
    reply.recalled = true;
    assert.equal(
      (
        await service.prepareAttachmentSummary(
          tx,
          'user',
          'chat',
          'CHANNEL',
          null,
          'file',
          '@AI Bot Summarize',
        )
      ).reused,
      undefined,
    );
    service.assertSummaryMedia = () => {
      throw Error('Forbidden source');
    };
    await assert.rejects(
      service.prepareAttachmentSummary(
        tx,
        'user',
        'chat',
        'CHANNEL',
        null,
        'file',
        '@AI Bot Summarize',
      ),
      /Forbidden source/,
    );
  } finally {
    if (previous === undefined) delete process.env.CONVERSATION_AI_ENABLED;
    else process.env.CONVERSATION_AI_ENABLED = previous;
  }
});

test('linked-document cache keys use the authorized current revision and fail closed on revocation/outage', async () => {
  const previous = {
    enabled: process.env.CONVERSATION_AI_ENABLED,
    url: process.env.AI_SERVICE_URL,
    key: process.env.COMMUNICATION_TO_AI_KEY,
    fetch: globalThis.fetch,
  };
  process.env.CONVERSATION_AI_ENABLED = 'true';
  process.env.AI_SERVICE_URL = 'http://unit.invalid';
  process.env.COMMUNICATION_TO_AI_KEY = 'test-service-key-not-a-real-secret';
  try {
    let revision = 'a'.repeat(64),
      unavailable = false,
      forbidden = false;
    const actors = [];
    globalThis.fetch = async (_url, options) => {
      actors.push(JSON.parse(options.body).userId);
      if (unavailable) throw new TypeError('Network unavailable');
      return {
        ok: !forbidden,
        status: forbidden ? 403 : 200,
        body: { cancel: async () => {} },
        json: async () => ({ revision, versionId: 'version', sizeBytes: 10 }),
      };
    };
    const service = new ConversationAiService({}, {});
    service.summaryMedia = async () => ({
      s3Key: 'documents/owner/file.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
    });
    service.assertSummaryMedia = () => {};
    const tx = { $executeRaw: async () => {}, $queryRaw: async () => [] };
    const first = await service.prepareAttachmentSummary(
      tx,
      'actor1',
      'chat',
      'CHANNEL',
      null,
      'file',
      '@AI Bot Summarize',
    );
    const second = await service.prepareAttachmentSummary(
      tx,
      'actor2',
      'chat',
      'CHANNEL',
      null,
      'file',
      '@AI Bot Summarize',
    );
    assert.equal(first.key, second.key);
    assert.deepEqual(actors, ['actor1', 'actor2']);
    revision = 'b'.repeat(64);
    assert.notEqual(
      (
        await service.prepareAttachmentSummary(
          tx,
          'actor2',
          'chat',
          'CHANNEL',
          null,
          'file',
          '@AI Bot Summarize',
        )
      ).key,
      first.key,
    );
    forbidden = true;
    await assert.rejects(
      service.prepareAttachmentSummary(
        tx,
        'revoked',
        'chat',
        'CHANNEL',
        null,
        'file',
        '@AI Bot Summarize',
      ),
      /Forbidden/,
    );
    unavailable = true;
    await assert.rejects(
      service.prepareAttachmentSummary(
        tx,
        'actor1',
        'chat',
        'CHANNEL',
        null,
        'file',
        '@AI Bot Summarize',
      ),
      /Service Unavailable/,
    );
  } finally {
    for (const [name, value] of [
      ['CONVERSATION_AI_ENABLED', previous.enabled],
      ['AI_SERVICE_URL', previous.url],
      ['COMMUNICATION_TO_AI_KEY', previous.key],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    globalThis.fetch = previous.fetch;
  }
});

test('reusing a summary never inserts another message, increments a thread, registers AI, or publishes an event', async () => {
  for (const direct of [false, true]) {
    for (const threadParentId of [undefined, 'thread']) {
      const unexpected = () => { throw Error('Duplicate side effect'); };
      const cached = { id: 'existing', senderId: 'original-owner', type: 'TEXT', content: '@AI Bot Summarize',
        ...(direct ? { conversationId: 'chat' } : { channelId: 'chat' }), threadParentId, medias: [],
        summary: { reused: true, status: 'COMPLETED', reply: { id: 'reply', content: 'Saved summary' } } };
      const tx = {
        channelMember: { findUnique: async () => ({ channel: { id: 'chat', spaceId: 'space', space: { createdBy: 'sender' } } }) },
        spaceMember: { findUnique: async () => ({ role: 'OWNER' }) },
        directConversationParticipant: { findUnique: async () => ({}) },
        message: { create: unexpected, update: unexpected }, directMessage: { create: unexpected, update: unexpected },
      };
      const prisma = { $transaction: async run => run(tx) };
      const ai = { prepareAttachmentSummary: async () => ({ key: 'key', reused: cached }), register: unexpected, notify: unexpected };
      const profiles = { attachSenderProfileToMessage: async message => message };
      const voice = { register: unexpected, notify: unexpected };
      let result;
      if (direct) {
        const service = new DirectMessageMutationService({ assertCanSend: async () => {} }, {}, prisma, ai, profiles, {},
          { mapDirectMessage: message => message }, { publishDirectMessageCreated: unexpected }, {}, {}, voice);
        result = await service.createDirectMessage('chat', 'sender', '@AI Bot Summarize', 'TEXT', undefined, threadParentId, undefined, 'file');
      } else {
        const mutations = new MessageMutationService(prisma, {}, ai, profiles, voice);
        const service = new MessagePublishingService({ publishChannelMessageCreated: unexpected }, mutations, { getThreadFollowers: async () => [] }, {});
        result = await service.createMessageAndPublish('chat', 'sender', '@AI Bot Summarize', 'TEXT', undefined, undefined, undefined, threadParentId, undefined, 'file');
      }
      assert.equal(result.id, 'existing');
      assert.equal(result.summary.reused, true);
    }
  }
});
