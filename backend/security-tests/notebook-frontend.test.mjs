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
const { sourceFailure } = require('./features/ai/source-failure.ts');

test('source limits display their actionable reason and prevent futile retries', () => {
  for (const message of [
    'File vượt 24 trang/hình cần Vision hoặc 16 MiB ảnh trích xuất. Hãy tách tài liệu nhỏ hơn.',
    'VISUAL_PAGE_LIMIT', 'This file exceeds 100,000 tokens.', 'PDF vượt 100 trang.',
    'Nội dung DOCX sau giải nén vượt 100 MiB.',
  ]) {
    const result = sourceFailure(message);
    assert.equal(result.canRetry, false);
    assert.match(result.message, /split/i);
    assert.ok(!result.message.includes('Unable to process this source'));
  }
  assert.match(sourceFailure('VISUAL_PAGE_LIMIT').message, /24 pages\/images.*16 MiB/);
});

test('transient Vision provider errors still allow retry and preserve the real message', () => {
  const message = 'VISION_PROVIDER_FAILED: The image-reading provider returned HTTP 503.';
  assert.deepEqual(sourceFailure(message), { message, canRetry: true });
  assert.equal(sourceFailure(null).canRetry, true);
});

test('daily Vision quota and queued fallback explain the actual state', () => {
  assert.match(sourceFailure('VISION_DAILY_QUOTA: hết hạn mức').message, /00:00 UTC/);
  assert.match(sourceFailure('RAG_FALLBACK_PENDING: đang chuẩn bị').message, /background/);
});

test('files rejected by the previous 40k token limit can retry under the new 100k limit', () => {
  for (const message of ['Nội dung vượt 40.000 token/file.', 'This file exceeds 40,000 tokens.']) {
    const result = sourceFailure(message);
    assert.equal(result.canRetry, true);
    assert.match(result.message, /now 100,000 tokens/);
  }
});
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
