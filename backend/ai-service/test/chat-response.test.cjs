const { test } = require("node:test");
const assert = require("node:assert/strict");
let model;
require.cache[
  require.resolve("../dist/infrastructure/integrations/llm.client")
] = {
  exports: { modelAnswer: (...args) => model(...args) },
};
const {
  immediateReply,
  generateChatResponse,
} = require("../dist/modules/chat/chat-response");
const evidence = [{ label: "S1", name: "fixture.md", text: "fixture" }];

test("a citation coverage gap preserves the answer with a durable visible note", async () => {
  model = async function* () {
    yield "Grounded [[S1]].\n\nA sentence without a direct citation.";
  };
  const sent = [];
  const answer = await generateChatResponse(
    "a document question",
    evidence,
    new AbortController().signal,
    (text) => sent.push(text),
  );
  assert.equal(answer.citations.length, 1);
  assert.match(answer.content, /Một số đoạn chưa có trích dẫn/);
  assert.equal(sent.join(""), answer.content);
});

test("a follow-up uses authorized conversation context instead of the generic clarification shortcut", async () => {
  const history = [
    { role: "user", content: "Ngân sách dự án?" },
    { role: "assistant", content: "500 USD" },
  ];
  model = async function* (_question, _evidence, _signal, options) {
    assert.deepEqual(options.history, history);
    yield "Details [[S1]]";
  };
  const answer = await generateChatResponse(
    "giải thích thêm",
    evidence,
    new AbortController().signal,
    () => {},
    history,
  );
  assert.equal(answer.content, "Details [[S1]]");
});
const {
  isNotebookSummaryRequest,
} = require("../dist/modules/chat/summary-request");

test("whole-file summaries use the background path while focused questions stay in chat", () => {
  for (const question of [
    "tóm tắt các file cho tôi",
    "Hãy tóm tắt tất cả tài liệu",
    "tom tat cac file cho minh",
    "tóm tắt tài liệu đã chọn",
    "please summarize these files",
  ])
    assert.equal(isNotebookSummaryRequest(question), true, question);
  for (const question of [
    "tóm tắt chương 2",
    "tóm tắt khái niệm Mekong realism",
    "file này nói gì về du lịch?",
    "hello",
  ])
    assert.equal(isNotebookSummaryRequest(question), false, question);
});

test("capability questions return local help without retrieval evidence or model citations", async () => {
  model = async function* () {
    throw new Error("Unexpected model call");
  };
  for (const question of [
    "bạn có thể làm gì",
    "Bạn có thể làm gì?",
    "ban co the lam gi",
    "bạn làm được gì",
    "bạn có chức năng gì",
    "bạn có thể làm gì với tài liệu",
    "what can you do?",
    "how can you help me",
  ]) {
    for (const sources of [[], evidence]) {
      const sent = [];
      const answer = await generateChatResponse(
        question,
        sources,
        new AbortController().signal,
        (text) => sent.push(text),
      );
      assert.ok(answer.content.length > 0);
      assert.equal(answer.content, immediateReply(question));
      assert.deepEqual(answer.citations, []);
      assert.deepEqual(sent, [answer.content]);
    }
  }
  for (const question of [
    "bạn có thể làm gì để giảm ô nhiễm theo tài liệu",
    "what can you do about pollution according to the source",
  ])
    assert.equal(immediateReply(question), null);
});

test("standalone unclear requests are handled locally, while specific questions remain document queries", async () => {
  model = async function* () {
    throw new Error("Unexpected model call");
  };
  for (const question of ["hello", "giải thích đi", "là sao?", "help me"]) {
    const sent = [];
    const answer = await generateChatResponse(
      question,
      evidence,
      new AbortController().signal,
      (text) => sent.push(text),
    );
    assert.equal(answer.content, immediateReply(question));
    assert.deepEqual(answer.citations, []);
    assert.equal(sent.length, 1);
  }
  for (const question of [
    "giải thích Mekong realism",
    "tóm tắt tài liệu",
    "help me compare these sources",
  ])
    assert.equal(immediateReply(question), null);
});

test("clarifications are buffered until completion and validated before any visible delta", async () => {
  const sent = [];
  model = async function* (_q, _e, _s, options) {
    options.onClarification();
    yield "Bạn muốn hỏi ";
    assert.equal(sent.length, 0);
    yield "phần nào?";
    assert.equal(sent.length, 0);
  };
  const answer = await generateChatResponse(
    "unclear topic",
    evidence,
    new AbortController().signal,
    (text) => sent.push(text),
  );
  assert.deepEqual(sent, ["Bạn muốn hỏi phần nào?"]);
  assert.deepEqual(answer.citations, []);
  for (const invalid of [
    "A factual answer.",
    "a".repeat(301) + "?",
    "Question?\nAnother?",
    "Which [[S1]]?",
  ]) {
    const output = [];
    model = async function* (_q, _e, _s, options) {
      options.onClarification();
      yield invalid;
    };
    await assert.rejects(
      generateChatResponse(
        "unclear topic",
        evidence,
        new AbortController().signal,
        (text) => output.push(text),
      ),
    );
    assert.deepEqual(output, []);
  }
});

test("normal answers retain streaming and citation validation; cancelled clarifications emit nothing", async () => {
  const sent = [];
  model = async function* () {
    yield "Supported ";
    assert.deepEqual(sent, ["Supported "]);
    yield "[[S1]]";
  };
  const answer = await generateChatResponse(
    "a specific question",
    evidence,
    new AbortController().signal,
    (text) => sent.push(text),
  );
  assert.deepEqual(answer.citations, evidence);
  model = async function* () {
    yield "Unsupported answer";
  };
  await assert.rejects(
    generateChatResponse(
      "a specific question",
      evidence,
      new AbortController().signal,
      () => {},
    ),
  );
  const controller = new AbortController();
  model = async function* (_q, _e, _s, options) {
    options.onClarification();
    yield "Which part?";
    controller.abort();
  };
  const cancelled = [];
  await assert.rejects(
    generateChatResponse("unclear topic", evidence, controller.signal, (text) =>
      cancelled.push(text),
    ),
  );
  assert.deepEqual(cancelled, []);
});
