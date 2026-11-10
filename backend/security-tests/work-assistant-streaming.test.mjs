import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';

const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true, experimentalDecorators: true } });
const ai = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
function stub(file, exports) {
  const id = ai.resolve(file), module = new Module(id);
  module.filename = id; module.loaded = true; module.exports = exports; ai.cache[id] = module;
}
let provider, admissions = 0;
const { ChatOpenAI } = ai('@langchain/openai');
stub('./src/config/env.config.ts', { config: { LLM_MODEL: 'test-model', LLM_TOKENS_PER_MINUTE: 20000 } });
stub('./src/infrastructure/integrations/ai-model.provider.ts', { aiModels: {
  createChatModel: () => new ChatOpenAI({ model: 'test-model', apiKey: 'test-only', maxRetries: 0,
    configuration: { baseURL: 'https://model.invalid/v1', fetch: (...args) => provider(...args) } }),
} });
stub('./src/infrastructure/integrations/llm.client.ts', { admitModel: async () => { admissions++; } });
stub('./src/infrastructure/database/ai-database.client.ts', { AiDatabaseClient: class {} });
const { workAnswer } = ai('./src/modules/work-assistant/work-agent.ts');
const { WorkStore } = ai('./src/modules/work-assistant/work-store.ts');
const { WorkAssistantGenerationService } = ai('./src/modules/work-assistant/work-assistant-generation.service.ts');
const { WorkAssistantWorkflowService } = ai('./src/modules/work-assistant/work-assistant-workflow.service.ts');

const context = {
  scope: { audience: 'mine' }, fetchedAt: '2026-11-10T07:00:00Z', date: '2026-11-10', timeZone: 'Asia/Ho_Chi_Minh', days: 7,
  period: { from: '2026-11-04T00:00:00Z', to: '2026-11-11T00:00:00Z' }, projectIds: ['project'],
  sources: { project: { state: 'ready' }, calendar: { state: 'empty' } }, metrics: { project: null, personal: null, focusSeconds: 0, focusSessions: 0 },
  tasks: [], detailPartial: false, busyPartial: false, focusPerTask: [], schedulingBasis: 'calendar', freeSlots: [], busy: [],
};
const encoder = new TextEncoder();
const frame = (delta, finish_reason = null) => encoder.encode('data: ' + JSON.stringify({
  id: 'test-completion', object: 'chat.completion.chunk', model: 'test-model', choices: [{ index: 0, delta, finish_reason }],
}) + '\n\n');
function response(parts, close = true) {
  return new Response(new ReadableStream({ start(controller) {
    for (const part of parts) controller.enqueue(part);
    if (close) controller.close();
  } }), { headers: { 'content-type': 'text/event-stream' } });
}
const finalResponse = text => response([frame({ role: 'assistant', content: text }), frame({}, 'stop')]);

test('twenty chronological history messages reach the real SDK; text arrives before completion', async () => {
  let finish, received = false, settled = false, request;
  provider = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(frame({ role: 'assistant', content: 'Hello ' }));
      finish = () => { controller.enqueue(frame({ content: 'world' })); controller.enqueue(frame({}, 'stop')); controller.close(); };
    } }), { headers: { 'content-type': 'text/event-stream' } });
  };
  const stored = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `history-${i}`, project_ids: [] }));
  const deltas = [];
  const answer = workAnswer('Plan today', stored, context, async () => context, new AbortController().signal, () => {}, async text => { deltas.push(text); received = true; });
  void answer.then(() => { settled = true; });
  try {
    for (let i = 0; i < 100 && !received; i++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(received, true);
    assert.equal(settled, false);
    assert.equal(request.stream, true);
    const history = request.messages.filter(message => /^history-/.test(message.content ?? ''));
    assert.equal(history.length, 20);
    assert.equal(history[0].content, 'history-5');
    assert.equal(history.at(-1).content, 'history-24');
  } finally { finish?.(); }
  assert.equal((await answer).content, 'Hello world');
  assert.equal(deltas.join(''), 'Hello world');
});

test('the database fetches the same twenty recent messages in chronological order', async () => {
  const latest = Array.from({ length: 20 }, (_, i) => ({ id: 20 - i }));
  const store = new WorkStore({ rows: async (sql, args) => {
    assert.match(sql, /created_at DESC,id DESC LIMIT 20/);
    assert.deepEqual(args, ['session']);
    return latest;
  } });
  assert.deepEqual((await store.recent({ id: 'session' })).map(m => m.id), Array.from({ length: 20 }, (_, i) => i + 1));
});

test('split tool arguments survive streaming and provisional tool prose is reset', async () => {
  let calls = 0, resets = 0, text = '', reads = [];
  provider = async () => ++calls === 1 ? response([
    frame({ role: 'assistant', content: 'Checking another period' }),
    frame({ tool_calls: [{ index: 0, id: 'lookup', type: 'function', function: { name: 'get_work_context', arguments: '{"days":' } }] }),
    frame({ tool_calls: [{ index: 0, function: { arguments: '"30"}' } }] }), frame({}, 'tool_calls'),
  ]) : finalResponse('Fresh monthly answer');
  const result = await workAnswer('Review work', [], context, async days => { reads.push(days); return { ...context, days }; }, new AbortController().signal,
    () => {}, async delta => { text += delta; }, () => { resets++; text = ''; });
  assert.equal(calls, 2); assert.equal(resets, 1); assert.deepEqual(reads, [30]);
  assert.equal(text, 'Fresh monthly answer'); assert.equal(result.context.days, 30);
});

test('truncated, unfinished and empty streams cannot become a completed answer', async () => {
  for (const [parts, expected] of [
    [[frame({ content: 'Partial' }), frame({}, 'length')], /Truncated/],
    [[frame({ content: 'Partial' })], /Incomplete work response/],
    [[frame({}, 'stop')], /Invalid work answer/],
  ]) {
    provider = async () => response(parts);
    await assert.rejects(workAnswer('Plan today', [], context, async () => context, new AbortController().signal, () => {}), expected);
  }
});

test('an interrupted tool stream never starts another model call', async () => {
  let calls = 0, reads = 0;
  provider = async () => { calls++; return response([
    frame({ role: 'assistant', tool_calls: [{ index: 0, id: 'lookup', type: 'function', function: { name: 'get_work_context', arguments: '{"days":"30"}' } }] }),
  ]); };
  await assert.rejects(workAnswer('Review work', [], context, async () => { reads++; return context; },
    new AbortController().signal, () => {}), /Incomplete work response/);
  assert.equal(calls, 1); assert.equal(reads, 0);
});

test('cancellation between deltas aborts generation without replaying the model', async () => {
  let calls = 0, chunks = 0;
  provider = async () => { calls++; return response([frame({ content: 'First' }), frame({ content: 'Second' }), frame({}, 'stop')]); };
  const controller = new AbortController();
  await assert.rejects(workAnswer('Plan today', [], context, async () => context, controller.signal, () => {}, async () => { chunks++; controller.abort(); }), /abort/i);
  assert.equal(chunks, 1); assert.equal(calls, 1);
});

async function workflowCase({ finishReason = 'stop', revoke = false, cancel = false } = {}) {
  const events = [], saved = [], failures = [];
  provider = async () => response([frame({ content: 'Answer' }), frame({}, finishReason)]);
  const store = {
    begin: async () => {}, recent: async () => [], canceled: async () => cancel,
    finish: async (...args) => { saved.push(args); return { id: 'saved', role: 'assistant', content: args[4], sources: [] }; },
    fail: async (...args) => failures.push(args),
  };
  const access = { scope: () => context.scope, visible: async (_actor, messages) => messages };
  const generation = new WorkAssistantGenerationService({ read: async () => context,
    authorize: async () => new Set(revoke ? [] : context.projectIds) }, store, access);
  const workflow = new WorkAssistantWorkflowService(store, generation, access);
  const stream = { destroyed: false, start() {}, heartbeat() {}, onClose() { return () => {}; }, end() {}, emit: (event, data) => events.push({ event, data }) };
  await workflow.answer({ id: 'actor' }, stream, { id: 'session' }, { question: 'Plan today', requestId: 'request', audience: 'mine' });
  return { events, saved, failures };
}

test('SSE delivers deltas then the saved message; failures and cancellation never persist drafts', async () => {
  const success = await workflowCase();
  assert.equal(success.saved.length, 1);
  assert.ok(success.events.findIndex(e => e.event === 'delta') < success.events.findIndex(e => e.event === 'done'));
  assert.equal(success.events.find(e => e.event === 'done').data.message.content, 'Answer');
  for (const options of [{ finishReason: 'length' }, { revoke: true }, { cancel: true }]) {
    const result = await workflowCase(options);
    assert.equal(result.saved.length, 0);
    assert.equal(result.events.some(e => e.event === 'done'), false);
    assert.equal(result.failures.length, 1);
    assert.ok(result.events.some(e => e.event === 'error'));
    if (options.revoke) assert.equal(result.events.some(e => e.event === 'delta'), false);
  }
  assert.ok(admissions > 0);
});
