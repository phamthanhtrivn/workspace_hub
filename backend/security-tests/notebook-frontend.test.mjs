import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true } });
tooling('tsconfig-paths').register({ baseUrl: fileURLToPath(new URL('../../frontend/web/', import.meta.url)), paths: { '@/*': ['./*'] } });
const require = createRequire(new URL('../../frontend/web/package.json', import.meta.url));
const { readAnswer } = require('./features/ai/api/stream.ts');
const encoder = new TextEncoder();
function body(text, size = 1) {
  const bytes = encoder.encode(text); let offset = 0;
  return new ReadableStream({ pull(c) { if (offset >= bytes.length) return c.close(); c.enqueue(bytes.slice(offset, offset + size)); offset += size; } });
}
test('Notebook UI handles fragmented UTF-8 and CRLF events, including done without a final delimiter', async () => {
  const events = [];
  await readAnswer(body('event: delta\r\ndata: {"text":"Tiếng Việt"}\r\n\r\nevent: done\r\ndata: {}'), event => events.push(event));
  assert.equal(events[0].data.text, 'Tiếng Việt'); assert.equal(events.at(-1).event, 'done');
});
test('Notebook UI finishes on done and cancels the reader even if the socket remains open', async () => {
  let canceled = false;
  const stream = new ReadableStream({ start(c) { c.enqueue(encoder.encode('event: done\ndata: {}\n\n')); }, cancel() { canceled = true; } });
  await readAnswer(stream, () => {}); assert.equal(canceled, true); assert.equal(stream.locked, false);
});
test('Notebook UI rejects interrupted responses and preserves specific operational errors', async () => {
  await assert.rejects(readAnswer(body('event: delta\ndata: {"text":"partial"}\n\n'), () => {}), /connection closed/);
  await assert.rejects(readAnswer(body('event: error\ndata: {"message":"Could not connect to the AI provider. Please try again."}\n\n'), () => {}), /connect to the AI provider/);
});

function stub(file, exports) {
  const id = require.resolve(file), entry = new Module(id); entry.filename = id; entry.loaded = true; entry.exports = exports; require.cache[id] = entry;
}
let slots = [], cursor = 0, send;
stub('react', {
  useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
  useRef(value) { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
  useCallback: fn => fn, useEffect: () => {},
});
stub('@tanstack/react-query', {});
stub('./store/store.ts', {});
stub('./features/ai/api/notebooks.api.ts', { notebooksApi: { answer: (...args) => send(...args), cancel: async () => {} } });
const { useNotebookChat } = require('./features/ai/hooks/use-notebook.ts');
function hook(refresh) { cursor = 0; return useNotebookChat('notebook', refresh); }
const sources = [{ id: 'source', revision: 'r1' }];
test('failed Notebook requests allow a user-driven retry without automatic resend', async () => {
  slots = []; let calls = 0; send = async () => { calls++; throw new Error('provider timeout'); };
  const refresh = async () => {};
  await hook(refresh).ask('Hướng dẫn tôi làm', sources);
  const state = hook(refresh); assert.equal(calls, 1); assert.equal(state.busy, false);
  assert.equal(state.retryQuestion, 'Hướng dẫn tôi làm'); assert.equal(state.error, 'provider timeout');
  send = async () => { calls++; };
  await state.ask(state.retryQuestion, sources);
  assert.equal(calls, 2); assert.equal(hook(refresh).retryQuestion, '');
});
test('a refresh failure after a saved answer never exposes a model retry or causes an unhandled rejection', async () => {
  slots = []; let calls = 0; send = async () => { calls++; };
  const refresh = async () => { throw new Error('refresh failed'); };
  await hook(refresh).ask('Question', sources);
  const state = hook(refresh); assert.equal(calls, 1); assert.equal(state.retryQuestion, '');
  assert.match(state.error, /answer was saved/); assert.equal(state.busy, false);
});
