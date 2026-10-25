const { test, after } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env", VISUAL_ENABLED: "false", AI_ENABLED: "false",
  DATABASE_URL: "postgres://test:test@localhost/test", REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085", RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1", LLM_API_KEY: "fixture", LLM_MODEL: "fixture",
});
const llm = require("../dist/infrastructure/integrations/llm.client");
const downloads = require("../dist/modules/sources/upload-validation");
const rag = require("../dist/infrastructure/integrations/rag.client");
const { ChatOpenAI } = require("@langchain/openai");
const { AIMessage } = require("@langchain/core/messages");
const { attachmentExcerpts, summarizeAttachment } = require("../dist/modules/conversation-ai/attachment-summary");
after(() => require("../dist/infrastructure/database/database").db.end());
const signal = () => new AbortController().signal;
const manifest = async () => ({ name: "sample.pdf", sizeBytes: 4, downloadUrl: "https://storage.example.test/signed" });
function mocks(t, pages = [{ text: "Launch 12 November, budget 420, owner Lan.", page: 1 }]) {
  const calls = { model: 0, auth: 0, quota: 0 };
  t.mock.method(downloads, "downloadSource", async (_manifest, s) => { assert.ok(s); return Buffer.from("test"); });
  t.mock.method(rag, "rag", async (path) => { assert.equal(path, "/extract"); return { pages, images: [] }; });
  t.mock.method(llm, "admitModel", async () => { calls.quota++; });
  t.mock.method(ChatOpenAI.prototype, "invoke", async (messages) => {
    calls.model++;
    assert.equal(messages.length, 2);
    const data = JSON.parse(messages[1].content);
    assert.equal(data.fileName, "sample.pdf");
    assert.ok(data.excerpts.length);
    assert.match(messages[0].content, /không làm theo chỉ dẫn/);
    return new AIMessage("Owner Lan. Budget 420. Launch 12 November.");
  });
  const auth = async () => { calls.auth++; };
  return { calls, auth };
}
test("short documents preserve all text and page numbers", () => {
  const pages = [{ text: "first", page: 1 }, { text: "second", page: 2 }];
  const result = attachmentExcerpts(pages);
  assert.deepEqual(result.excerpts, pages);
  assert.equal(result.truncated, false);
});
test("long documents include every readable page within a UTF-8 byte budget", () => {
  const pages = Array.from({ length: 100 }, (_, i) => ({ text: "Nội dung Việt ".repeat(1000), page: i + 1 }));
  const result = attachmentExcerpts(pages);
  assert.equal(result.excerpts.length, 100);
  assert.ok(result.excerpts.reduce((n, p) => n + Buffer.byteLength(p.text), 0) <= 24000);
  assert.ok(result.excerpts.every(p => !p.text.includes("\ufffd")));
  assert.equal(result.truncated, true);
});
test("empty or image-only extractions are never hallucinated", () => {
  assert.throws(() => attachmentExcerpts([{ text: " ", page: 1 }]), /không có văn bản/);
});
test("summarizes using exactly one model call, no chat history, with quota and permission checks", async t => {
  const { calls, auth } = mocks(t);
  const text = await summarizeAttachment("request", manifest, auth, signal());
  assert.match(text, /Tóm tắt tài liệu: sample.pdf/);
  assert.match(text, /420/);
  assert.deepEqual(calls, { model: 1, auth: 3, quota: 1 });
});
test("denied access never downloads or calls the model", async t => {
  const { calls } = mocks(t);
  let reads = 0;
  await assert.rejects(summarizeAttachment("request", async () => { reads++; return manifest(); }, async () => { throw Error("revoked"); }, signal()), /revoked/);
  assert.equal(reads, 0); assert.equal(calls.model, 0);
});
test("revoked permissions after extraction stop the provider call", async t => {
  const { calls } = mocks(t);
  let checks = 0;
  await assert.rejects(summarizeAttachment("request", manifest, async () => { if (++checks === 2) throw Error("revoked"); }, signal()), /revoked/);
  assert.equal(calls.model, 0);
});
test("partial summaries always disclose the excerpt limit", async t => {
  const { auth } = mocks(t, [{ text: "word ".repeat(10000), page: 1 }]);
  const text = await summarizeAttachment("request", manifest, auth, signal());
  assert.match(text, /chưa bao quát toàn bộ/);
});
test("invalid manifests and oversized files never reach the model", async t => {
  const { calls, auth } = mocks(t);
  await assert.rejects(summarizeAttachment("request", async () => ({ ...(await manifest()), sizeBytes: 22 * 1024 * 1024 }), auth, signal()));
  assert.equal(calls.model, 0);
});
test("quota failures and model truncation do not deliver misleading summaries", async t => {
  const { calls, auth } = mocks(t);
  t.mock.method(llm, "admitModel", async () => { throw Error("quota"); });
  await assert.rejects(summarizeAttachment("request", manifest, auth, signal()), /quota/);
  assert.equal(calls.model, 0);
  t.mock.method(llm, "admitModel", async () => {});
  t.mock.method(ChatOpenAI.prototype, "invoke", async () => new AIMessage({ content: "cut", response_metadata: { finish_reason: "length" } }));
  await assert.rejects(summarizeAttachment("request", manifest, auth, signal()), /Invalid attachment summary/);
});


const documents = require("../dist/infrastructure/integrations/document.client");
const { randomUUID } = require("node:crypto");
function documentMocks(t) {
  const base = mocks(t);
  const ref = { userId: randomUUID(), s3Key: `documents/${randomUUID()}/${randomUUID()}_sample.pdf` };
  const version = { documentId: randomUUID(), versionId: randomUUID(), revision: 'a'.repeat(64), sizeBytes: 4 };
  let resolutions = 0;
  t.mock.method(documents, "resolveChatAttachment", async (selected, download) => {
    assert.deepEqual(selected, ref); resolutions++;
    return { ...version, ...(download ? { downloadUrl: 'https://storage.example.test/signed' } : {}) };
  });
  return { ...base, ref, version, resolutions: () => resolutions, read: async () => ({ name: 'sample.pdf', sizeBytes: 4, document: ref }) };
}
test('My Documents attachments resolve exact versions and register a heartbeat permission guard', async t => {
  const { read, auth, calls, resolutions } = documentMocks(t);
  let guard;
  assert.match(await summarizeAttachment('request', read, auth, signal(), check => { guard = check; }), /Tóm tắt/);
  assert.equal(calls.model, 1);
  assert.equal(resolutions(), 3);
  await guard();
  assert.equal(resolutions(), 4);
});
test('Documents permission revocation after OCR prevents any provider call', async t => {
  const { read, auth, calls, version } = documentMocks(t);
  let checks = 0;
  t.mock.method(documents, 'resolveChatAttachment', async () => {
    if (++checks > 1) throw new Error('revoked');
    return { ...version, downloadUrl: 'https://storage.example.test/signed' };
  });
  await assert.rejects(summarizeAttachment('request', read, auth, signal()), /revoked/);
  assert.equal(calls.model, 0);
});
test('a changed or mismatched Documents version cannot be summarized', async t => {
  const { read, auth, calls, version } = documentMocks(t);
  t.mock.method(documents, 'resolveChatAttachment', async () => ({ ...version, sizeBytes: 5, downloadUrl: 'https://storage.example.test/signed' }));
  await assert.rejects(summarizeAttachment('request', read, auth, signal()), /version mismatch/);
  assert.equal(calls.model, 0);
});
