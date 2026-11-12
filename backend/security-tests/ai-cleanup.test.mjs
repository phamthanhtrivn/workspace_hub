import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';
import { createHash } from 'node:crypto';

const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true } });
const require = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
function stub(file, exports) {
  const id = require.resolve(file), entry = new Module(id);
  entry.filename = id; entry.loaded = true; entry.exports = exports; require.cache[id] = entry;
}
const config = {
  LLM_MODEL: 'notebook', LLM_BASE_URL: 'https://provider.invalid/v1', LLM_MAX_TOKENS: 256,
  LLM_QUOTA_WAIT_MS: 0, LLM_TIMEOUT_MS: 1000, LLM_TOKENS_PER_MINUTE: 20000,
  LLM_REQUESTS_PER_MINUTE: 5, LLM_REQUESTS_PER_DAY: 100,
  CONVERSATION_AI_MODEL: 'chat', CONVERSATION_AI_MAX_TOKENS: 512,
  WORK_ASSISTANT_MAX_TOKENS: 1800,
};
stub('./src/config/env.config.ts', { config });
let quota = false, providerCalls = 0, beforeCalls = 0, providerError;
stub('./src/infrastructure/database/database.ts', {
  transaction: async (run) => run({ query: async (sql) => ({ rows: sql.startsWith('SELECT\n')
    ? [{ rpm: quota ? 5 : 0, tokens: 0, daily: 0, retry_after_ms: 1 }] : [] }) }),
});
stub('./src/infrastructure/integrations/provider-http.ts', {
  providerFetch: async () => {
    providerCalls++;
    if (providerError) throw providerError;
    return new Response('data: {"choices":[{"delta":{"content":"Answer [[S1]]"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n');
  },
});
const { waitForModelAdmission } = require('./src/common/model-admission.ts');
const { ModelMinuteQuotaException, ModelDailyQuotaException } = require('./src/common/errors/model-quota.exception.ts');
const { modelAnswer } = require('./src/infrastructure/integrations/llm.client.ts');
const { readSummarySections, synthesizeDocument } = require('./src/jobs/summary-synthesis.ts');
const { AIMessageChunk } = require('@langchain/core/messages');
let selectedModels = [];
stub('./src/infrastructure/integrations/chat-model.ts', {
  createChatModel: (model, maxTokens) => {
    selectedModels.push({ model, maxTokens });
    return {
      invoke: async () => ({ content: 'meeting answer', response_metadata: { finish_reason: 'stop' } }),
      stream: async function* () {
        yield new AIMessageChunk({ content: 'work answer', response_metadata: { finish_reason: 'stop' } });
      },
    };
  },
});
const { meetingSummaryCacheKey, meetingSummaryText } = require('./src/modules/meeting-summary/summary.ts');
const { workAnswer } = require('./src/modules/work-assistant/work-agent.ts');
const { singleFlight } = require('./src/common/single-flight.ts');

test('quota admission retries only minute limits and supports a bounded wait', async () => {
  let calls = 0;
  await waitForModelAdmission(async () => {
    if (++calls === 1) throw new ModelMinuteQuotaException(1);
  }, new AbortController().signal, 1000);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(waitForModelAdmission(async () => {
    calls++; throw new ModelMinuteQuotaException(1000);
  }, new AbortController().signal, 5), ModelMinuteQuotaException);
  assert.equal(calls, 1);
});

test('daily quotas, unknown failures and a zero wait are never retried', async () => {
  for (const error of [new ModelDailyQuotaException(1000), new Error('unknown'), new ModelMinuteQuotaException(1)]) {
    let calls = 0;
    await assert.rejects(waitForModelAdmission(async () => { calls++; throw error; },
      new AbortController().signal, 0), (failure) => failure === error);
    assert.equal(calls, 1);
  }
});

test('cancellation interrupts quota waiting and pre-aborted work is not admitted', async () => {
  const controller = new AbortController();
  const waiting = waitForModelAdmission(async () => { throw new ModelMinuteQuotaException(60000); }, controller.signal, 60000);
  const rejected = assert.rejects(waiting, { name: 'AbortError' });
  controller.abort(); await rejected;
  await assert.rejects(waitForModelAdmission(async () => assert.fail('admission started'), controller.signal), { name: 'AbortError' });
});

async function answer(beforeCall = async () => { beforeCalls++; }) {
  let text = '';
  for await (const delta of modelAnswer('summary', [{ label: 'S1', text: 'source', name: 'file' }],
    new AbortController().signal, { purpose: 'summary', beforeCall })) text += delta;
  return text;
}

test('summary marks the provider checkpoint only after quota admission succeeds', async () => {
  quota = true; providerCalls = beforeCalls = 0; providerError = undefined;
  await assert.rejects(answer(), ModelMinuteQuotaException);
  assert.equal(beforeCalls, 0); assert.equal(providerCalls, 0);
  quota = false;
  assert.equal(await answer(), 'Answer [[S1]]');
  assert.equal(beforeCalls, 1); assert.equal(providerCalls, 1);
  await assert.rejects(answer(async () => { throw new Error('canceled before send'); }), /canceled before send/);
  assert.equal(providerCalls, 1);
});

test('a provider failure cannot enter the quota retry loop', async () => {
  providerCalls = 0; providerError = new ModelMinuteQuotaException(1);
  try {
    await assert.rejects(answer(), ModelMinuteQuotaException);
    assert.equal(providerCalls, 1);
  } finally { providerError = undefined; }
});

function key(batch) {
  return 'synthesis:source:' + createHash('sha256').update(JSON.stringify({ batch,
    model: config.LLM_MODEL, provider: config.LLM_BASE_URL, maxTokens: config.LLM_MAX_TOKENS,
    version: 'synthesis-v2' })).digest('hex');
}

test('legacy synthesis checkpoints at multiple levels resume without another model call', async () => {
  const citation = { label: 'S1', text: 'source' };
  const originals = Array.from({ length: 4 }, (_, i) => ({ content: String(i).repeat(8000), citations: [citation], sourceId: 'source' }));
  const intermediate = originals.map((note, i) => ({ sourceId: key([note]), content: 'note ' + i + ' [[S1]]', citations: [citation] }));
  const final = { sourceId: key(intermediate), content: 'saved final [[S1]]', citations: [citation] };
  const saved = readSummarySections([...originals, ...intermediate, final]);
  assert.equal(saved.filter((section) => !section.checkpointKey).length, 4);
  assert.ok(saved.every((section) => section.sourceId === 'source'));
  const result = await synthesizeDocument('source', saved.filter((section) => !section.checkpointKey), saved,
    async () => assert.fail('completed provider work was replayed'), async () => assert.fail('checkpoint rewritten'));
  assert.equal(result.content, final.content); assert.equal(result.checkpointKey, undefined);
});

test('new synthesis checkpoints keep source identity and are reusable', async () => {
  const originals = [1, 2].map((i) => ({ content: 'note ' + i, citations: [{ label: 'S1' }], sourceId: 'source' }));
  const saved = [...originals]; let calls = 0, checkpoints = 0;
  await synthesizeDocument('source', originals, saved, async () => { calls++; return 'merged [[S1]]'; }, async () => { checkpoints++; });
  assert.equal(saved.at(-1).sourceId, 'source'); assert.ok(saved.at(-1).checkpointKey.startsWith('synthesis:'));
  await synthesizeDocument('source', originals, saved, async () => assert.fail('replayed'), async () => assert.fail('rewritten'));
  assert.equal(calls, 1); assert.equal(checkpoints, 1);
});

test('Meeting Summary cache configuration is independent of Conversation AI', () => {
  const initial = meetingSummaryCacheKey('transcript');
  config.CONVERSATION_AI_MODEL = 'another-chat'; config.CONVERSATION_AI_MAX_TOKENS = 1024;
  assert.equal(meetingSummaryCacheKey('transcript'), initial);
  config.MEETING_SUMMARY_MODEL = 'meeting';
  assert.notEqual(meetingSummaryCacheKey('transcript'), initial);
});

test('Work Assistant streams with its own model and token limit', async () => {
  quota = false; selectedModels = [];
  config.WORK_ASSISTANT_MODEL = 'work-model'; config.WORK_ASSISTANT_MAX_TOKENS = 1800;
  const context = {
    fetchedAt: '2026-11-12T00:00:00Z', date: '2026-11-12', timeZone: 'Asia/Ho_Chi_Minh',
    tasks: [], freeSlots: [], focusPerTask: [], busy: [], detailPartial: false,
  };
  const deltas = [];
  const result = await workAnswer('what is next?', [], context, new AbortController().signal,
    () => {}, async (text) => deltas.push(text));
  assert.deepEqual(selectedModels, [{ model: 'work-model', maxTokens: 1800 }]);
  assert.equal(result.content, 'work answer'); assert.deepEqual(deltas, ['work answer']);
  assert.deepEqual(result.referenceTasks, []);
});

test('Meeting Summary applies its own model and stage token caps', async () => {
  selectedModels = []; config.MEETING_SUMMARY_MODEL = 'meeting-model'; config.MEETING_SUMMARY_MAX_TOKENS = 4096;
  const signal = new AbortController().signal;
  assert.equal(await meetingSummaryText('transcript', false, signal), 'meeting answer');
  assert.equal(await meetingSummaryText('notes', true, signal), 'meeting answer');
  assert.deepEqual(selectedModels, [{ model: 'meeting-model', maxTokens: 1536 }, { model: 'meeting-model', maxTokens: 3072 }]);
});

test('overlapping permission checkpoints share one request, then recheck fresh access', async () => {
  let release, calls = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  const authorize = singleFlight(async () => { calls++; await gate; return 'allowed'; });
  const poller = authorize(), checkpoint = authorize();
  assert.equal(poller, checkpoint); assert.equal(calls, 1);
  release(); assert.deepEqual(await Promise.all([poller, checkpoint]), ['allowed', 'allowed']);
  await authorize(); assert.equal(calls, 2);
});

test('failed permission checks propagate to all callers and are not cached', async () => {
  const error = new Error('access revoked'); let calls = 0;
  const authorize = singleFlight(async () => { calls++; throw error; });
  const results = await Promise.allSettled([authorize(), authorize()]);
  assert.equal(calls, 1);
  for (const result of results) { assert.equal(result.status, 'rejected'); assert.equal(result.reason, error); }
  await assert.rejects(authorize(), (failure) => failure === error); assert.equal(calls, 2);
});

test('revoked work access prevents any provider request after quota admission', async () => {
  selectedModels = [];
  const context = { tasks: [], busy: [], freeSlots: [], focusPerTask: [], detailPartial: false };
  await assert.rejects(workAnswer('next?', [], context, new AbortController().signal,
    () => {}, async () => {}, async () => { throw new Error('revoked'); }), /revoked/);
  assert.deepEqual(selectedModels, []);
});
