import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../communication-service/package.json', import.meta.url));
require('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true, experimentalDecorators: true } });
const { VoiceTranscriptDispatchService } = require('./src/modules/media/voice-transcript-dispatch.service.ts');
const { MessageMutationService } = require('./src/modules/message/message-mutation.service.ts');
const { DirectMessageMutationService } = require('./src/modules/direct-message/direct-message-mutation.service.ts');
const { VOICE_TRANSCRIPT, VoiceChatType } = require('./src/modules/media/types/voice-transcript.constants.ts');
const { ServiceUnavailableException, ForbiddenException } = require('@nestjs/common');

const audio = { id: 'audio', name: 'upload.mp3', mimeType: 'audio/mpeg', sizeBytes: 500 };

async function enabled(run) {
  const previous = process.env.VOICE_TRANSCRIPTION_ENABLED;
  process.env.VOICE_TRANSCRIPTION_ENABLED = 'true';
  try { await run(); }
  finally {
    if (previous === undefined) delete process.env.VOICE_TRANSCRIPTION_ENABLED;
    else process.env.VOICE_TRANSCRIPTION_ENABLED = previous;
  }
}

test('background registration covers all audio attachments, bounds size, and respects the feature flag', async () => {
  await enabled(async () => {
    const registered = [];
    const tx = { $executeRaw: async (_sql, ...args) => { registered.push(args); } };
    const service = new VoiceTranscriptDispatchService({}, {});
    const medias = [audio, { ...audio, id: 'generic', mimeType: 'application/octet-stream', name: 'music.FLAC' },
      { ...audio, id: 'image', mimeType: 'image/png' }, { ...audio, id: 'empty', sizeBytes: 0 },
      { ...audio, id: 'oversized', sizeBytes: VOICE_TRANSCRIPT.maxBytes + 1 }];
    await service.register(medias, 'sender', VoiceChatType.CHANNEL, tx);
    assert.deepEqual(registered, [['audio', 'sender', 'CHANNEL'], ['generic', 'sender', 'CHANNEL']]);
    process.env.VOICE_TRANSCRIPTION_ENABLED = 'false';
    await service.register([audio], 'sender', VoiceChatType.DIRECT_MESSAGE, tx);
    assert.equal(registered.length, 2);
  });
});

test('dispatcher retries temporary queue outages within a finite budget and cancels revoked access', async () => {
  await enabled(async () => {
    for (const [attempts, failure, status] of [
      [1, new ServiceUnavailableException(), 'PENDING'],
      [VOICE_TRANSCRIPT.dispatchAttempts, new ServiceUnavailableException(), 'FAILED'],
      [1, new ForbiddenException(), 'CANCELLED'], [1, undefined, 'DISPATCHED'],
      [VOICE_TRANSCRIPT.dispatchAttempts + 1, undefined, 'FAILED'],
    ]) {
      const updates = [], requests = [];
      const prisma = {
        $queryRaw: async () => [{ media_id: 'audio', actor_id: 'sender', chat_type: 'DIRECT_MESSAGE', attempts }],
        $executeRaw: async (_sql, ...values) => { updates.push(values); },
      };
      const service = new VoiceTranscriptDispatchService(prisma, { proxy: async (...args) => {
        requests.push(args); if (failure) throw failure;
      } });
      service.logger = { warn() {} };
      await service.dispatch();
      assert.equal(updates[0][0], status);
      assert.equal(requests.length, attempts > VOICE_TRANSCRIPT.dispatchAttempts ? 0 : 1);
      if (requests.length) assert.deepEqual(requests[0], ['audio', 'sender', 'DIRECT_MESSAGE', true]);
      assert.match(updates[0].at(-1), /^[a-f0-9-]{36}$/, 'updates are fenced by a lease token');
    }
  });
});

function mutationFixture(direct, { rollback = false } = {}) {
  const order = [];
  const created = { id: 'message', senderId: 'sender', type: 'TEXT', medias: [audio] };
  const tx = {
    channelMember: { findUnique: async () => ({ channel: { spaceId: 'space', space: { createdBy: 'sender' } } }), update: async () => {} },
    spaceMember: { findUnique: async () => ({ role: 'OWNER' }) },
    message: { create: async () => created }, channel: { update: async () => {} },
    directConversationParticipant: { findUnique: async () => ({}), update: async () => {} },
    directMessage: { create: async () => created }, directConversation: { update: async () => {} },
  };
  const prisma = { $transaction: async run => {
    const result = await run(tx);
    if (rollback) throw Error('transaction rolled back');
    order.push('committed'); return result;
  } };
  const s3 = { assertAttachments: async () => {} };
  const ai = { register: async () => {}, notify: () => {} };
  const profiles = { attachSenderProfileToMessage: async message => message };
  const dispatch = {
    register: async (medias, actor, chatType, transaction) => {
      assert.equal(transaction, tx); assert.deepEqual(medias, [audio]);
      assert.equal(actor, 'sender'); assert.equal(chatType, direct ? 'DIRECT_MESSAGE' : 'CHANNEL');
      order.push('registered');
    },
    notify: () => { order.push('wake'); },
  };
  const service = direct
    ? new DirectMessageMutationService({ assertCanSend: async () => {} }, s3, prisma, ai, profiles, {},
      { mapDirectMessage: message => message }, { publishDirectMessageCreated: async () => {} }, {}, {}, dispatch)
    : new MessageMutationService(prisma, s3, ai, profiles, dispatch);
  return { order, send: () => direct
    ? service.createDirectMessage('conversation', 'sender', '', 'TEXT', [audio])
    : service.createMessage('channel', 'sender', '', 'TEXT', [audio]) };
}

test('channel and direct sends register audio inside the message transaction and wake only after commit', async () => {
  for (const direct of [false, true]) {
    const fixture = mutationFixture(direct);
    assert.equal((await fixture.send()).id, 'message');
    assert.deepEqual(fixture.order, ['registered', 'committed', 'wake']);
    const rolledBack = mutationFixture(direct, { rollback: true });
    await assert.rejects(rolledBack.send(), /rolled back/);
    assert.deepEqual(rolledBack.order, ['registered']);
  }
});

test('sender returns while background inference is still unresolved', async () => {
  await enabled(async () => {
    let release;
    const inference = new Promise(resolve => { release = resolve; });
    let started = false;
    const service = new VoiceTranscriptDispatchService({
      $queryRaw: async () => [{ media_id: 'audio', actor_id: 'sender', chat_type: 'CHANNEL', attempts: 1 }],
      $executeRaw: async () => {},
    }, { proxy: async () => { started = true; await inference; } });
    service.notify();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(started, true);
    release();
    await service.dispatch();
    await service.onModuleDestroy();
  });
});
