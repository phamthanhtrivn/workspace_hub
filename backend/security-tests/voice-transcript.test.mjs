import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';
import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const communication = createRequire(new URL('../communication-service/package.json', import.meta.url));
communication('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true, experimentalDecorators: true } });
const ai = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
const { VoiceTranscriptService: MediaTranscripts } = communication('./src/modules/media/voice-transcript.service.ts');
const { VoiceChatType } = communication('./src/modules/media/types/voice-transcript.constants.ts');
const { ResponseInterceptor } = communication('./src/common/interceptors/response.interceptor.ts');
const { lastValueFrom, of } = communication('rxjs');
const httpPayload = response => lastValueFrom(new ResponseInterceptor().intercept({}, { handle: () => of(response) }));
const audio = communication('../../frontend/web/features/chat/utils/voice-audio.ts');

function stub(file, exports) {
  const id = ai.resolve(file), module = new Module(id);
  module.filename = id; module.loaded = true; module.exports = exports; ai.cache[id] = module;
}
let database = async () => [], sourceLookups = [], sourceDenied = false, prepare, speech;
const queued = [];
const config = { AI_ENABLED: 'true', VOICE_TRANSCRIPTION_ENABLED: 'true', COMMUNICATION_TO_AI_KEY: 'test-only-service-key'.repeat(3) };
stub('./src/config/env.config.ts', { config });
stub('./src/infrastructure/database/database.ts', { rows: (...args) => database(...args) });
stub('./src/infrastructure/queue/notebook.queue.ts', { meetingSummaryQueue: {
  client: Promise.resolve({ get: async () => 'ready:voice-v1' }),
  add: async (...args) => { queued.push(args); },
} });
stub('./src/modules/voice-transcript/voice-source.ts', { voiceSource: async (...args) => {
  sourceLookups.push(args.slice(0, 3));
  if (sourceDenied) throw Error('Access revoked');
  return { mediaId: args[0], chatType: args[2], revision: 'revision', url: 'https://media.invalid/audio', sizeBytes: 500 };
} });
stub('./src/modules/meeting-summary/media.ts', { prepareAudioChunks: (...args) => prepare(...args) });
stub('./src/modules/meeting-summary/speech.client.ts', { recognizeMeetingChunk: (...args) => speech(...args) });
const { VoiceTranscriptService: PrivateTranscripts } = ai('./src/modules/voice-transcript/voice-transcript.service.ts');
const { processVoiceTranscript } = ai('./src/jobs/voice-transcript.processor.ts');
const { pcmWaveSeconds } = ai('./src/modules/voice-transcript/wave-duration.ts');
const { VOICE_TRANSCRIPT } = ai('./src/modules/voice-transcript/voice.constants.ts');

function mediaService({ denied = false, found = true, mimeType = 'audio/webm' } = {}) {
  const checks = [];
  const record = { id: 'media', s3Key: 'private/audio', sizeBytes: 500, mimeType };
  const prisma = {
    media: { findFirst: async (query) => { checks.push(query); return found ? { ...record, message: { channelId: 'channel' } } : null; } },
    directMedia: { findFirst: async (query) => { checks.push(query); return found ? { ...record, message: { conversationId: 'conversation' } } : null; } },
  };
  const authorize = async (resource, actor) => { checks.push([resource, actor]); if (denied) throw Error('Forbidden'); };
  const service = new MediaTranscripts(prisma, { generateAttachmentDownloadUrl: async () => 'https://media.invalid/signed' },
    { assertPrivateAccess: authorize }, { assertCanRead: authorize });
  return { service, checks };
}

test('voice recorder keeps MIME, filename and duration consistent across browsers', () => {
  assert.equal(audio.preferredRecordingType(type => type.startsWith('audio/mp4')), 'audio/mp4;codecs=mp4a.40.2');
  assert.deepEqual(audio.recordingFormat('audio/mp4;codecs=mp4a.40.2'), { mimeType: 'audio/mp4', extension: 'm4a' });
  assert.deepEqual(audio.recordingFormat('audio/webm;codecs=opus'), { mimeType: 'audio/webm', extension: 'webm' });
  assert.deepEqual(audio.recordingFormat('audio/ogg;codecs=opus'), { mimeType: 'audio/ogg', extension: 'ogg' });
  assert.equal(audio.preferredRecordingType(() => false), undefined);
  assert.throws(() => audio.recordingFormat('video/webm'));
  assert.equal(audio.formatVoiceTime(Infinity), '0:00');
  assert.equal(audio.formatVoiceTime(65.9), '1:05');
  assert.deepEqual(audio.waveformPeaks(new Float32Array(8), 4), [0, 0, 0, 0]);
  assert.deepEqual(audio.waveformPeaks(new Float32Array([0.25, -1, 0.5, -0.5]), 2), [1, 0.5]);
});

test('source access checks exact channel/direct membership and excludes recalled/deleted messages', async () => {
  for (const type of Object.values(VoiceChatType)) {
    const { service, checks } = mediaService();
    const result = await service.source('media', 'reader', type);
    assert.deepEqual(checks[0].where, { id: 'media', message: { recalled: false, deletedAt: null } });
    assert.deepEqual(checks[1], [type === VoiceChatType.CHANNEL ? 'channel' : 'conversation', 'reader']);
    assert.equal(result.data.chatType, type);
    assert.match(result.data.revision, /^[a-f0-9]{64}$/);
    const response = await httpPayload(result);
    assert.equal(response.data.mediaId, 'media', 'source must survive the real HTTP response interceptor without nested data');
    await assert.rejects(mediaService({ denied: true }).service.source('media', 'outsider', type), /Forbidden/);
  }
  await assert.rejects(mediaService({ found: false }).service.attachment('media', 'reader', VoiceChatType.CHANNEL), /unavailable/);
  await assert.rejects(mediaService({ mimeType: 'video/webm' }).service.attachment('media', 'reader', VoiceChatType.CHANNEL), /not a supported/);
});

test('public proxy uses trusted actor, bounds its response and rechecks access after waiting', async () => {
  const previousFetch = globalThis.fetch;
  const previousEnv = { ...process.env };
  Object.assign(process.env, { VOICE_TRANSCRIPTION_ENABLED: 'true', COMMUNICATION_TO_AI_KEY: 'test-only'.repeat(8), AI_SERVICE_URL: 'https://ai.invalid' });
  try {
    const { service } = mediaService();
    globalThis.fetch = async (_url, options) => {
      assert.deepEqual(JSON.parse(options.body), { actorId: 'reader', chatType: VoiceChatType.CHANNEL });
      return Response.json({ status: 'COMPLETED', text: 'Private words', extra: 'must not leak' });
    };
    const response = await httpPayload(await service.proxy('media', 'reader', VoiceChatType.CHANNEL, true));
    assert.deepEqual(response.data, { status: 'COMPLETED', text: 'Private words', error: null });
    const attachment = service.attachment.bind(service); let checks = 0;
    service.attachment = async (...args) => { if (++checks === 2) throw Error('Access revoked'); return attachment(...args); };
    await assert.rejects(service.proxy('media', 'reader', VoiceChatType.CHANNEL, false), /Access revoked/);
    for (const body of ['invalid JSON', JSON.stringify({ status: 'COMPLETED', text: 'x'.repeat(60001) })]) {
      globalThis.fetch = async () => new Response(body);
      await assert.rejects(mediaService().service.proxy('media', 'reader', VoiceChatType.CHANNEL, false), /unavailable/);
    }
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
  }
});

test('cached transcript queries isolate actor, media, chat type and revision; completed work is not queued twice', async () => {
  const service = new PrivateTranscripts(); sourceLookups = []; sourceDenied = false; queued.length = 0;
  database = async (sql, args) => {
    assert.match(sql, /media_id=\$1 AND actor_id=\$2 AND chat_type=\$3 AND revision=\$4/);
    assert.deepEqual(args, ['media', args[1], 'CHANNEL', 'revision']);
    return args[1] === 'owner' ? [{ status: 'COMPLETED', text: 'Private words', error: null }] : [];
  };
  assert.equal((await service.start('media', 'owner', 'CHANNEL')).text, 'Private words');
  assert.equal((await service.status('media', 'other', 'CHANNEL')).status, 'NOT_CREATED');
  assert.equal(queued.length, 0);
  assert.deepEqual(sourceLookups.map(args => args[1]), ['owner', 'other']);
  sourceDenied = true;
  await assert.rejects(service.status('media', 'owner', 'CHANNEL'), /Access revoked/);
  sourceDenied = false;
  assert.throws(() => service.authorize('wrong-service-key'), /Unauthorized/);
});

function wave(seconds) {
  const size = Math.round(seconds * 32000), buffer = Buffer.alloc(44 + size);
  buffer.write('RIFF'); buffer.writeUInt32LE(36 + size, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28); buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(size, 40);
  return buffer;
}

test('WAV duration validation rejects invalid or truncated decoder output', () => {
  assert.equal(pcmWaveSeconds(wave(45)), 45);
  assert.throws(() => pcmWaveSeconds(Buffer.from('not audio')));
  assert.throws(() => pcmWaveSeconds(wave(1).subarray(0, 50)), /Incomplete/);
  const wrong = wave(1); wrong.writeUInt32LE(64000, 28);
  assert.throws(() => pcmWaveSeconds(wrong), /mono 16 kHz/);
});

async function runProcessor({ revoked = false, seconds = 1, chunks = [] } = {}) {
  const updates = []; sourceDenied = false; sourceLookups = [];
  const state = { actor_id: 'owner', media_id: 'media', chat_type: 'CHANNEL', revision: 'revision', chunks };
  database = async (sql, args) => { updates.push([sql, args]); return sql.includes('RETURNING *') ? [state] : [{ run_id: 'run' }]; };
  let directory, recognitions = 0;
  prepare = async (_source, dir, _signal, limits) => {
    directory = dir; assert.equal(limits.maxSeconds, 300);
    const file = join(dir, 'audio-00000.wav'); await writeFile(file, wave(seconds)); return [file];
  };
  speech = async (_file, _signal, language) => {
    assert.equal(language, 'auto'); recognitions++;
    if (revoked) sourceDenied = true;
    return 'Xin chào. Hello.';
  };
  try { await processVoiceTranscript('run'); }
  finally { sourceDenied = false; }
  await assert.rejects(access(directory), 'temporary audio must be removed');
  return { updates, recognitions };
}

test('worker transcribes in original language, checkpoints and clears audio without broadcasting', async () => {
  const { updates, recognitions } = await runProcessor();
  assert.equal(recognitions, 1);
  assert.ok(updates.some(([sql, args]) => sql.includes("status='COMPLETED'") && args[1] === 'Xin chào. Hello.'));
  assert.ok(sourceLookups.length >= 3, 'permission checked before download, inference and completion');
  const resumed = await runProcessor({ chunks: [{ index: 0, text: 'Saved words' }] });
  assert.equal(resumed.recognitions, 0);
  assert.ok(resumed.updates.some(([sql, args]) => sql.includes("status='COMPLETED'") && args[1] === 'Saved words'));
});

test('worker does not publish a result after revocation and rejects audio over five minutes', async () => {
  for (const options of [{ revoked: true }, { seconds: 301 }]) {
    const { updates } = await runProcessor(options);
    assert.ok(!updates.some(([sql]) => sql.includes("status='COMPLETED'")));
    assert.ok(updates.some(([sql, args]) => sql.includes("status='FAILED'") && args[1] === (options.seconds ? VOICE_TRANSCRIPT.tooLong : VOICE_TRANSCRIPT.failed)));
  }
});
