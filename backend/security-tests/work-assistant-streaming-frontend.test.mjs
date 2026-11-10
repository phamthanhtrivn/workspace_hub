import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';

const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true, jsx: 'react-jsx' } });
tooling('tsconfig-paths').register({ baseUrl: fileURLToPath(new URL('../../frontend/web/', import.meta.url)), paths: { '@/*': ['./*'] } });
const web = createRequire(new URL('../../frontend/web/package.json', import.meta.url));
const { JSDOM } = web('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
for (const name of ['window', 'document', 'navigator', 'HTMLElement'])
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function stub(file, exports) {
  const id = web.resolve(file), module = new Module(id);
  module.filename = id; module.loaded = true; module.exports = exports; web.cache[id] = module;
}
const sessionId = '10000000-0000-4000-8000-000000000001';
const answerId = '10000000-0000-4000-8000-000000000002';
const savedAnswer = { id: answerId, role: 'assistant', content: 'Hello world', sources: [], created_at: '2026-11-10T00:00:00Z' };
let controller, persisted = [], signal, canceled = 0;
stub('./lib/axios.ts', { api: {
  get: async path => ({ data: { data: path.endsWith('/sessions') ? { sessions: [], nextCursor: null }
    : { id: sessionId, projectId: null, messages: persisted, nextCursor: null } } }),
  post: async (path, _body, options) => {
    if (path.endsWith('/cancel')) { canceled++; return {}; }
    signal = options.signal;
    return { data: new ReadableStream({ start(value) {
      controller = value;
      signal.addEventListener('abort', () => value.error(new DOMException('Aborted', 'AbortError')), { once: true });
    } }) };
  },
} });
stub('./lib/ai-feedback.ts', { aiErrorMessage: error => error.message, aiServiceMessage: value => value, assistantStatus: value => value });
stub('./store/store.ts', { useAppSelector: () => 'actor' });
stub('./features/user-setting/api/user-setting.api.ts', { getUserSettings: async () => ({ data: { timezone: 'Asia/Ho_Chi_Minh' } }) });
const React = web('react');
const { renderHook, act, waitFor, cleanup } = web('@testing-library/react');
const { QueryClient, QueryClientProvider } = web('@tanstack/react-query');
const { useWorkAssistant } = web('./features/work-assistant/hooks/use-work-assistant.ts');
const encoder = new TextEncoder();
function emit(event, data) { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
async function mount() {
  controller = undefined; persisted = []; canceled = 0;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const hook = renderHook(() => useWorkAssistant('actor', undefined, 'mine'), {
    wrapper: ({ children }) => React.createElement(QueryClientProvider, { client }, children),
  });
  await waitFor(() => assert.equal(hook.result.current.history.isSuccess, true));
  let pending;
  act(() => { pending = hook.result.current.send('Plan today'); });
  await waitFor(() => assert.ok(controller));
  return { ...hook, pending, client };
}

test('the bubble receives incremental text, clears tool drafts and replaces the draft with the saved message', async () => {
  const view = await mount();
  try {
    act(() => { emit('delta', { text: 'Checking data' }); });
    await waitFor(() => assert.equal(view.result.current.reply?.content, 'Checking data'));
    assert.equal(view.result.current.streaming, true);
    act(() => { emit('answer-reset', {}); });
    await waitFor(() => assert.equal(view.result.current.reply, null));
    act(() => { emit('delta', { text: 'Hello ' }); emit('delta', { text: 'world' }); });
    await waitFor(() => assert.equal(view.result.current.reply?.content, 'Hello world'));
    assert.equal(view.result.current.messages.length, 0);
    assert.ok(view.result.current.status);
    await act(async () => {
      persisted = [savedAnswer]; emit('done', { message: savedAnswer }); controller.close(); await view.pending;
    });
    await waitFor(() => assert.equal(view.result.current.messages.length, 1));
    assert.equal(view.result.current.messages[0].id, answerId);
    assert.equal(view.result.current.reply, null); assert.equal(view.result.current.streaming, false);
    assert.equal(view.result.current.pending, null); assert.equal(view.result.current.error, '');
  } finally { cleanup(); view.client.clear(); }
});

test('a stream ending without done removes the partial answer and shows an error', async () => {
  const view = await mount();
  try {
    act(() => { emit('delta', { text: 'Incomplete answer' }); });
    await waitFor(() => assert.ok(view.result.current.reply));
    await act(async () => { controller.close(); await view.pending; });
    assert.equal(view.result.current.reply, null); assert.equal(view.result.current.streaming, false);
    assert.match(view.result.current.error, /interrupted/);
    assert.equal(view.result.current.messages.length, 0);
  } finally { cleanup(); view.client.clear(); }
});

test('stop aborts the stream immediately and removes unfinished text', async () => {
  const view = await mount();
  try {
    act(() => { emit('delta', { text: 'Partial answer' }); });
    await waitFor(() => assert.ok(view.result.current.reply));
    await act(async () => { await view.result.current.stop(); await view.pending; });
    assert.equal(signal.aborted, true); assert.equal(canceled, 1);
    assert.equal(view.result.current.reply, null); assert.equal(view.result.current.streaming, false);
    assert.equal(view.result.current.notice, 'Response stopped.'); assert.equal(view.result.current.error, '');
  } finally { cleanup(); view.client.clear(); }
});

test('backend error clears a visible draft and never presents it as completed', async () => {
  const view = await mount();
  try {
    act(() => { emit('delta', { text: 'Partial answer' }); });
    await waitFor(() => assert.ok(view.result.current.reply));
    await act(async () => { emit('error', { message: 'Access changed' }); controller.close(); await view.pending; });
    assert.equal(view.result.current.reply, null); assert.equal(view.result.current.error, 'Access changed');
    assert.equal(view.result.current.messages.length, 0);
  } finally { cleanup(); view.client.clear(); }
});
