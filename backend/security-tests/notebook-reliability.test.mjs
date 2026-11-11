import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';
const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true } });
const require = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
const id = require.resolve('./src/config/env.config.ts'), entry = new Module(id);
entry.filename = id; entry.loaded = true; entry.exports = { config: { LLM_TIMEOUT_MS: 90000 } }; require.cache[id] = entry;
const { providerEvents } = require('./src/infrastructure/integrations/provider-events.ts');
const { notebookFailureMessage } = require('./src/modules/chat/notebook-failure.ts');
const { isFollowUp, retrievalQuestion } = require('./src/modules/chat/chat-history.ts');
const { ModelMinuteQuotaException } = require('./src/common/errors/model-quota.exception.ts');
const encoder = new TextEncoder();
function stream(text, size = 1) {
  const bytes = encoder.encode(text); let offset = 0;
  return new ReadableStream({ pull(controller) {
    if (offset >= bytes.length) return controller.close();
    controller.enqueue(bytes.slice(offset, offset + size)); offset += size;
  } });
}
async function collect(body) { const items = []; for await (const item of providerEvents(body)) items.push(item); return items; }
test('provider SSE survives split UTF-8, CRLF, comments, multiline JSON and an EOF without a newline', async () => {
  const frames = ': heartbeat\r\ndata: {"text":\r\ndata: "Tiếng Việt"}\r\n\r\ndata: {"finish":"stop"}';
  const result = await collect(stream(frames));
  assert.deepEqual(result.map(JSON.parse), [{ text: 'Tiếng Việt' }, { finish: 'stop' }]);
});
test('DONE immediately releases the provider stream without waiting for the connection to close', async () => {
  let canceled = false;
  const body = new ReadableStream({ start(c) { c.enqueue(encoder.encode('data: [DONE]\n\n')); }, cancel() { canceled = true; } });
  assert.deepEqual(await collect(body), []); assert.equal(canceled, true); assert.equal(body.locked, false);
});
test('large batches of small valid frames are allowed; one oversized frame is rejected', async () => {
  const frame = 'data: {"ok":true}\n\n';
  assert.equal((await collect(stream(frame.repeat(6000), 200000))).length, 6000);
  await assert.rejects(collect(stream('data: ' + 'x'.repeat(100001) + '\n\n', 200000)), /size limit/);
});
test('an interrupted provider stream propagates failure and releases the reader', async () => {
  const body = new ReadableStream({ start(c) { c.error(new Error('network interrupted')); } });
  await assert.rejects(collect(body), /network interrupted/); assert.equal(body.locked, false);
});
test('guidance follow-ups retrieve the preceding document topic', () => {
  const history = [{ role: 'user', content: 'Tài liệu 1 nói về gì?' }, { role: 'assistant', content: 'Bài TEST 01 trong Module_KTTH02.pdf.' }];
  assert.equal(isFollowUp('BẠN CÓ THỂ HƯỚNG DẪN TÔI LÀM KHÔNG'), true);
  assert.ok(retrievalQuestion('BẠN CÓ THỂ HƯỚNG DẪN TÔI LÀM KHÔNG', history).includes('Module_KTTH02.pdf'));
});
test('Notebook failure messages distinguish operational causes without exposing upstream content', () => {
  const cases = [
    [new TypeError('secret upstream', { cause: { code: 'ETIMEDOUT', syscall: 'connect' } }), /connect to the AI provider/],
    [new DOMException('secret', 'TimeoutError'), /timed out/],
    [new ModelMinuteQuotaException(1000), /request limit/],
    [new Error('secret HTTP 429'), /rate limiting/],
    [new Error('secret HTTP 401'), /credentials/],
    [new Error('AI trả lời thiếu trích dẫn hợp lệ'), /citations/],
    [new Error('AI chưa xác định phạm vi câu hỏi'), /invalid response format/],
    [new Error('RAG worker chưa sẵn sàng'), /retrieval/],
    [new Error('Câu trả lời bị cắt ở giới hạn 10000 token'), /output limit/],
    [new Error('Kết nối AI kết thúc trước khi hoàn tất'), /interrupted/],
    [new Error('secret upstream body'), /could not complete/],
  ];
  for (const [error, expected] of cases) {
    const message = notebookFailureMessage(error); assert.match(message, expected); assert.ok(!message.includes('secret'));
    assert.ok(!/[\u00c0-\u024f\u1e00-\u1eff]/.test(message), 'English UI must preserve this message');
  }
});
