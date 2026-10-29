const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const data = require("./fixtures/ai-service-cases.json");

Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  NODE_ENV: "test",
  AI_ENABLED: "false",
  VISUAL_ENABLED: "false",
  MEETING_SUMMARY_ENABLED: "false",
  CONVERSATION_AI_ENABLED: "false",
  DATABASE_URL: "postgres://fixture:fixture@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "fixture",
});
const { immediateReply } = require("../dist/modules/chat/chat-response");
const { isNotebookSummaryRequest } = require("../dist/modules/chat/summary-request");
const { requestedWorkWindows } = require("../dist/modules/work-assistant/work-agent");
const { workRange } = require("../dist/modules/work-assistant/work-time");
const { visibleSnapshot, citeEvidence } = require("../dist/common/evidence-policy");
const { inspectAnswerCitations } = require("../dist/modules/chat/citation-check");
const { conversationHistory } = require("../dist/modules/chat/chat-history");
const schemas = require("../dist/modules/work-assistant/work-assistant.schemas");
const { readResponseText } = require("../dist/common/read-response");
after(() => require("../dist/infrastructure/database/database").db.end());

test("evaluation fixtures have distinct IDs, explicit expectations and synthetic metadata", () => {
  assert.equal(data.synthetic, true);
  const groups = ["routing", "workWindows", "timeRanges", "snapshots", "citations", "schemas", "history", "httpBodies"];
  const ids = groups.flatMap((group) => {
    assert.ok(data[group].length > 0, group);
    return data[group].map((item) => item.id);
  });
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => typeof id === "string" && id.length));
  assert.ok(!JSON.stringify(data).includes("\uFFFD"));
});

for (const item of data.routing)
  test(`dataset/${item.id}: route the actual request instead of keywords`, () => {
    assert.equal(isNotebookSummaryRequest(item.question), item.summary);
    assert.equal(immediateReply(item.question) !== null, item.immediate);
  });

for (const item of data.workWindows)
  test(`dataset/${item.id}: distinguish task counts from reporting periods`, () => {
    assert.deepEqual(requestedWorkWindows(item.question), item.expected);
  });

for (const item of data.timeRanges)
  test(`dataset/${item.id}: use calendar dates across timezone boundaries`, () => {
    const range = workRange(new Date(item.now), item.zone, item.days);
    assert.deepEqual(
      { today: range.today, from: range.from, to: range.to },
      { today: item.today, from: item.from, to: item.to },
    );
  });

for (const item of data.snapshots)
  test(`dataset/${item.id}: preserve source access and exact revision`, () => {
    const original = data.sources[0];
    let current = structuredClone(data.sources);
    if (item.change === "remove") current.shift();
    else if (item.change === "revision") current[0].revision = "proposal-v3";
    else if (item.change === "add") current.push({ ...original, id: "unrelated" });
    else if (item.change !== "none") current[0].status = item.change;
    assert.equal(
      visibleSnapshot([{ id: original.id, revision: original.revision }], current),
      item.expected,
    );
  });

const evidence = citeEvidence(data.sources.map((source, index) => ({
  id: `chunk-${index}`,
  sourceId: source.id,
  text: index === 0 ? "Demo Atlas: 02/11/2026, 09:00." : "Ngân sách thử nghiệm: 120 triệu đồng.",
  position: index,
})), data.sources);
for (const item of data.citations)
  test(`dataset/${item.id}: citation structure${item.requiresSemanticReview ? " does not prove entailment" : ""}`, () => {
    if (item.reject) {
      assert.throws(() => inspectAnswerCitations(item.answer, evidence));
      return;
    }
    const result = inspectAnswerCitations(item.answer, evidence);
    assert.deepEqual(result.citations.map((citation) => citation.label), item.labels);
    assert.equal(result.uncitedBlocks.length, item.uncited);
  });

for (const item of data.schemas)
  test(`dataset/${item.id}: enforce the API input contract`, () => {
    assert.ok(schemas[item.schema], `Unknown schema ${item.schema}`);
    assert.equal(schemas[item.schema].safeParse(item.input).success, item.valid);
  });

for (const item of data.history)
  test(`dataset/${item.id}: do not replay stale or revoked document content`, () => {
    const source = { ...data.sources[0], status: item.status };
    const messages = [
      { role: "USER", content: "Khi nào demo Atlas?", sources: [{ id: source.id, revision: item.userRevision }] },
      { role: "ASSISTANT", content: "Ngày 02/11 lúc 09:00. [[S1]]", sources: [{ id: source.id, revision: item.answerRevision }] },
    ];
    assert.deepEqual(conversationHistory(messages, [source]), item.expected);
  });

for (const item of data.httpBodies)
  test(`dataset/${item.id}: enforce byte limits while decoding streamed UTF-8`, async () => {
    const bytes = Buffer.from(item.text);
    let offset = 0;
    const body = new ReadableStream({
      pull(controller) {
        if (offset >= bytes.length) return controller.close();
        controller.enqueue(bytes.subarray(offset, offset + item.chunkBytes));
        offset += item.chunkBytes;
      },
    });
    const response = new Response(body, {
      headers: item.contentLength === undefined ? {} : { "content-length": item.contentLength },
    });
    if (item.reject)
      await assert.rejects(readResponseText(response, item.maxBytes), (error) => error.getStatus() === 503);
    else
      assert.equal(await readResponseText(response, item.maxBytes), item.text);
    assert.equal(response.body.locked, false);
  });
