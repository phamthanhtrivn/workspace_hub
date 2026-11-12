import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire, Module } from "node:module";

const tooling = createRequire(
  new URL("../communication-service/package.json", import.meta.url),
);
tooling("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    moduleResolution: "Node",
    target: "ES2023",
    esModuleInterop: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
  },
});
const require = createRequire(
  new URL("../ai-service/api/package.json", import.meta.url),
);
function stub(file, exports) {
  const id = require.resolve(file),
    entry = new Module(id);
  entry.filename = id;
  entry.loaded = true;
  entry.exports = exports;
  require.cache[id] = entry;
}
stub("./src/config/env.config.ts", {
  config: {
    LLM_MODEL: "test",
    LLM_API_KEY: "test-only",
    LLM_BASE_URL: "https://provider.invalid/v1",
    LLM_TIMEOUT_MS: 5000,
    LLM_MAX_TOKENS: 10000,
    LLM_TOKENS_PER_MINUTE: 70000,
    LLM_REQUESTS_PER_MINUTE: 100,
    LLM_REQUESTS_PER_DAY: 100,
  },
});
let rowsImpl = async () => [],
  retrieveImpl = async () => assert.fail("unexpected retrieval");
stub("./src/infrastructure/database/database.ts", {
  transaction: async (run) =>
    run({ query: async () => ({ rows: [{ rpm: 0, tokens: 0, daily: 0 }] }) }),
  rows: (...args) => rowsImpl(...args),
});
stub("./src/infrastructure/integrations/rag.client.ts", {
  retrieve: (...args) => retrieveImpl(...args),
});
const {
  modelAnswer,
} = require("./src/infrastructure/integrations/llm.client.ts");
const {
  generateChatResponse,
  notebookIntent,
} = require("./src/modules/chat/chat-response.ts");
const {
  conversationHistory,
  isFollowUp,
  retrievalQuestion,
} = require("./src/modules/chat/chat-history.ts");
const {
  isClearlyUnrelated,
  notebookScopeRefusal,
} = require("./src/modules/chat/notebook-scope.ts");
const {
  isNotebookSummaryRequest,
} = require("./src/modules/chat/summary-request.ts");
const {
  isFirstQuestionRequest,
} = require("./src/modules/chat/history-recall.ts");
const evidence = [
  {
    id: "chunk",
    sourceId: "source",
    text: "The project builds an online clothing store.",
    position: 0,
    label: "S1",
    name: "Project.pdf",
    documentId: "doc",
    versionId: "v1",
  },
];

test("only explicit first-question recall bypasses document question routing", () => {
  for (const text of [
    "câu đầu tiên tôi hỏi là gì",
    "CÂU HỎI ĐẦU TIÊN CỦA TÔI LÀ GÌ?",
    "Tôi đã hỏi gì đầu tiên?",
    "What was my first question?",
  ])
    assert.equal(isFirstQuestionRequest(text), true, text);
  for (const text of [
    "Mua quần áo giúp tôi",
    "Câu đầu tiên tôi hỏi là gì rồi mua quần áo",
    "Câu đầu tiên trong tài liệu là gì",
  ])
    assert.equal(isFirstQuestionRequest(text), false, text);
});

test("recall reads the oldest owned Notebook question without the context window or model", async () => {
  stub("./src/modules/studio/studio.service.ts", { StudioService: class {} });
  const {
    ChatGenerationService,
  } = require("./src/modules/chat/chat-generation.service.ts");
  for (const mode of ["available", "empty", "changed"]) {
    let inserts = 0,
      authorized = 0;
    const emitted = [];
    retrieveImpl = async () =>
      assert.fail("recall must not retrieve or call a model");
    rowsImpl = async (sql, args) => {
      if (sql.startsWith("INSERT")) {
        inserts++;
        return [];
      }
      assert.match(sql, /n.owner_id=\$2/);
      assert.match(sql, /ORDER BY m.created_at ASC,m.id ASC LIMIT 1/);
      assert.deepEqual(args, ["notebook", "actor"]);
      return mode === "empty"
        ? []
        : [
            {
              content: "Original first question outside the last twenty turns",
              sources: [
                { id: "source", revision: mode === "changed" ? "old" : "r1" },
              ],
            },
          ];
    };
    const service = new ChatGenerationService({});
    service.history = async () =>
      assert.fail("recall must not depend on the sliding history window");
    const result = await service.generateReply({
      actor: { id: "actor" },
      notebookId: "notebook",
      question: "câu đầu tiên tôi hỏi là gì",
      sourceIds: ["source"],
      sources: [{ id: "source", revision: "r1", status: "READY" }],
      snapshot: [],
      stream: { emit: (_event, data) => emitted.push(data.text) },
      controller: new AbortController(),
      authorize: async () => {
        authorized++;
      },
      intent: { kind: "recall" },
    });
    assert.equal(inserts, 1);
    assert.equal(authorized, 1);
    assert.deepEqual(result.citations, []);
    assert.equal(emitted.join(""), result.content);
    assert.equal(
      result.content.includes("Original first question"),
      mode === "available",
    );
    if (mode === "empty") assert.match(result.content, /chưa gửi câu hỏi nào/);
    if (mode === "changed") assert.match(result.content, /đã thay đổi/);
  }
});

test("next-step questions retrieve the document identified in the preceding answer", async () => {
  const history = [
    { role: "user", content: "TÀI LIỆU 1 NÓI VỀ GÌ" },
    {
      role: "assistant",
      content:
        "Module_KTTH02.pdf là bài TEST 01, yêu cầu thiết lập lịch MSSV_Time.",
    },
  ];
  for (const question of [
    "GIỜ TÔI NÊN LÀM GÌ TRƯỚC",
    "Vậy bắt đầu từ đâu, tôi nên làm gì?",
    "What should I do first?",
  ]) {
    assert.equal(isFollowUp(question), true);
    assert.ok(
      retrievalQuestion(question, history).includes("Module_KTTH02.pdf"),
    );
    const { prompt } = await answer(
      question,
      ["[[ANSWER]] Bắt đầu với yêu cầu trong tài liệu. [[S1]]"],
      history,
    );
    assert.deepEqual(
      JSON.parse(prompt.messages[1].content).conversation,
      history,
    );
    assert.ok(
      prompt.messages[0].content.includes(
        "Do not ask whether they mean that document",
      ),
    );
  }
  assert.equal(isFollowUp("Tôi muốn đi chơi"), false);
});

async function answer(question, chunks, history = []) {
  const saved = globalThis.fetch;
  let calls = 0,
    prompt;
  globalThis.fetch = async (_url, options) => {
    calls++;
    prompt = JSON.parse(options.body);
    const events = chunks.map((content) => ({
      choices: [{ delta: { content } }],
    }));
    events.push({ choices: [{ delta: {}, finish_reason: "stop" }] });
    return new Response(
      events
        .map((event) => "data: " + JSON.stringify(event) + "\n\n")
        .join("") + "data: [DONE]\n\n",
    );
  };
  const emitted = [];
  try {
    const intent = notebookIntent(question);
    const directReply = intent.kind === "reply" ? intent.content : null;
    const result = await generateChatResponse(
      question,
      evidence,
      new AbortController().signal,
      (text) => emitted.push(text),
      history,
      [],
      directReply,
    );
    return { result, emitted, calls, prompt };
  } finally {
    globalThis.fetch = saved;
  }
}

test("social replies bypass retrieval generation without relaxing document citation checks", async () => {
  for (const question of [
    "Hi!",
    "Xin chào…",
    "Thanks!",
    "Thank you very much",
    "CẢM ƠN BẠN!",
    "Tạm biệt",
  ]) {
    const { result, calls } = await answer(question, ["unused"]);
    assert.equal(calls, 0);
    assert.ok(result.content);
    assert.deepEqual(result.citations, []);
  }
  const question = "Thanks, explain the project in this document";
  const { calls, prompt } = await answer(question, [
    "[[ANSWER]]The project builds a store. [[S1]]",
  ]);
  assert.equal(calls, 1);
  assert.ok(!prompt.messages[0].content.includes("no citation is needed"));
  await assert.rejects(
    answer(question, ["[[ANSWER]]An unsupported answer without citations."]),
    /trích dẫn/,
  );
});

test("personal shopping and leisure requests are refused without calling the model", async () => {
  for (const question of [
    "BẠN CÓ THỂ GIÚP TÔI MUA QUẦN ÁO KHÔNG",
    "TÔI MUỐN ĐI CHƠI",
    "Help me buy clothes",
  ]) {
    assert.equal(isClearlyUnrelated(question), true);
    const { result, emitted, calls } = await answer(question, [
      "Do not show this",
    ]);
    assert.equal(calls, 0);
    assert.equal(result.content, notebookScopeRefusal(question));
    assert.deepEqual(result.citations, []);
    assert.equal(emitted.join(""), result.content);
  }
});

test("documents and project questions about shopping remain allowed and retain citations", async () => {
  const question = "Tóm tắt dự án cửa hàng quần áo trong tài liệu";
  assert.equal(isClearlyUnrelated(question), false);
  const { result, emitted, prompt } = await answer(question, [
    "[[ANS",
    "WER]] Dự án xây dựng cửa hàng trực tuyến. [[S1]]",
  ]);
  assert.ok(result.content.includes("[[S1]]"));
  assert.equal(result.citations.length, 1);
  assert.ok(!emitted.join("").includes("[[ANSWER]]"));
  assert.ok(prompt.messages[0].content.includes("Scope check is mandatory"));
});

test("semantic scope refusal is fixed by the server and no provider prose is streamed", async () => {
  const { result, emitted } = await answer(
    "Lên lịch cá nhân cho tôi vào chiều nay",
    ["[[OUT_", "OF_SCOPE]] Try this clothing store instead."],
  );
  assert.equal(
    result.content,
    notebookScopeRefusal("Lên lịch cá nhân cho tôi vào chiều nay"),
  );
  assert.deepEqual(emitted, [result.content]);
  assert.deepEqual(result.citations, []);
});

test("short follow-ups are scope-checked against history without inheriting off-topic permissions", async () => {
  const history = [
    { role: "user", content: "Mua quần áo" },
    { role: "assistant", content: "Notebook chỉ trả lời về tài liệu." },
  ];
  const { result, prompt } = await answer(
    "CHIỀU NAY",
    ["[[OUT_OF_SCOPE]]"],
    history,
  );
  assert.equal(result.content, notebookScopeRefusal("CHIỀU NAY"));
  assert.deepEqual(
    JSON.parse(prompt.messages[1].content).conversation,
    history,
  );
  assert.ok(
    prompt.messages[0].content.includes(
      "an earlier off-topic answer never grants permission",
    ),
  );
});

test("in-scope ambiguity permits a short clarification without citations", async () => {
  const { result } = await answer("Giải thích phần đó trong tài liệu", [
    "[[CLAR",
    "IFY]] Bạn muốn giải thích phần nào của tài liệu?",
  ]);
  assert.equal(result.content, "Bạn muốn giải thích phần nào của tài liệu?");
  assert.deepEqual(result.citations, []);
});

test("unmarked model output fails closed before any answer text reaches the user", async () => {
  const original = globalThis.fetch;
  const emitted = [];
  globalThis.fetch = async () =>
    new Response(
      "data: " +
        JSON.stringify({
          choices: [
            { delta: { content: "Here is a shopping recommendation." } },
          ],
        }) +
        "\n\n",
    );
  try {
    await assert.rejects(
      generateChatResponse(
        "Suggest something",
        evidence,
        new AbortController().signal,
        (text) => emitted.push(text),
        [],
        [],
        null,
      ),
      /phạm vi/,
    );
    assert.deepEqual(emitted, []);
  } finally {
    globalThis.fetch = original;
  }
});

test("history retains source-bound clarification/refusal turns but excludes changed source revisions", () => {
  const sources = [{ id: "source", revision: "r1", status: "READY" }];
  const messages = [
    {
      role: "USER",
      content: "Giải thích",
      sources: [{ id: "source", revision: "r1" }],
    },
    {
      role: "ASSISTANT",
      content: "Bạn muốn giải thích phần nào của tài liệu?",
      sources: [{ id: "source", revision: "r1" }],
    },
  ];
  assert.equal(conversationHistory(messages, sources).length, 2);
  assert.equal(
    conversationHistory(messages, [{ ...sources[0], revision: "r2" }]).length,
    0,
  );
  assert.ok(notebookIntent("Tôi muốn đi chơi").content.includes("Notebook"));
});

test("whole-document summaries recognize the reported wording, polite suffixes and uppercase read-all requests", () => {
  for (const question of [
    "ĐỌC TOÀN BỘ TÀI LIỆU",
    "Đọc tất cả các nguồn đã chọn giúp tôi",
    "TÓM TẮT CÁC TÀI LIỆU GIÚP OTIO",
    "TÓM TẮT CÁC TÀI LIỆU GIÚP TÔI",
    "ĐỌC TOÀN BỘ VÀ TÓM TẮT CHO TÔI",
    "Đọc toàn bộ tài liệu và tóm tắt giúp mình",
    "Vui lòng tóm tắt các nguồn đã chọn cho tôi",
    "Tóm tắt tài liệu",
    "Summarize all selected documents for me",
    "Hãy tóm tắt toàn bộ nội dung của các tài liệu đã chọn",
    "Cho mình bản tóm tắt tài liệu",
    "Please give me a summary of all documents",
  ])
    assert.equal(isNotebookSummaryRequest(question), true, question);
  for (const question of [
    "Đọc toàn bộ tài liệu rồi giúp tôi mua quần áo",
    "Đọc toàn bộ tài liệu có nghĩa là gì?",
    "Tôi muốn mua quần áo",
    "Tóm tắt phần thanh toán trong tài liệu",
    "Tài liệu này hướng dẫn tóm tắt như thế nào?",
    "Tóm tắt các tài liệu rồi giúp tôi mua quần áo",
  ])
    assert.equal(isNotebookSummaryRequest(question), false, question);
});

test("the reported request goes to the complete-summary job instead of excerpt retrieval or the scope model", async () => {
  stub("./src/modules/studio/studio.service.ts", { StudioService: class {} });
  const {
    ChatGenerationService,
  } = require("./src/modules/chat/chat-generation.service.ts");
  let summaries = 0,
    inserts = 0;
  retrieveImpl = async () =>
    assert.fail("whole summaries must not use top-k retrieval");
  rowsImpl = async () => {
    inserts++;
    return [];
  };
  const service = new ChatGenerationService({
    artifact: async (_actor, notebookId, kind, sourceIds) => {
      assert.equal(notebookId, "notebook");
      assert.equal(kind, "SUMMARY");
      assert.deepEqual(sourceIds, ["source"]);
      summaries++;
      return { id: "summary-artifact", status: "QUEUED" };
    },
  });
  service.history = async () => [];
  const result = await service.generateReply({
    actor: { id: "actor", email: "test@example.invalid" },
    notebookId: "notebook",
    question: "TÓM TẮT CÁC TÀI LIỆU GIÚP OTIO",
    sourceIds: ["source"],
    sources: [],
    snapshot: [],
    stream: { emit: () => {} },
    controller: new AbortController(),
    authorize: async () => {},
    intent: { kind: "summary" },
  });
  assert.equal(result.artifactId, "summary-artifact");
  assert.equal(summaries, 1);
  assert.equal(inserts, 1);
});

test("summary generation disables reasoning and still requires a complete cited answer", async () => {
  const original = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(
      "data: " +
        JSON.stringify({
          choices: [
            {
              delta: { content: "A synthetic project summary. [[S1]]" },
              finish_reason: "stop",
            },
          ],
        }) +
        "\n\ndata: [DONE]\n\n",
    );
  };
  try {
    let content = "";
    for await (const delta of modelAnswer(
      "Summarize this document",
      evidence,
      new AbortController().signal,
      { purpose: "summary" },
    ))
      content += delta;
    assert.deepEqual(body.thinking, { type: "disabled" });
    assert.equal(body.max_tokens, 10000);
    assert.equal(content, "A synthetic project summary. [[S1]]");
    assert.ok(!body.messages[0].content.includes("Scope check is mandatory"));
    globalThis.fetch = async () =>
      new Response(
        "data: " +
          JSON.stringify({
            choices: [
              { delta: { content: "Incomplete" }, finish_reason: "length" },
            ],
          }) +
          "\n\n",
      );
    await assert.rejects(async () => {
      for await (const delta of modelAnswer(
        "Summarize this document",
        evidence,
        new AbortController().signal,
        { purpose: "summary" },
      ))
        void delta;
    }, /bị cắt/);
  } finally {
    globalThis.fetch = original;
  }
});

test("provider HTTP errors release the response body instead of exhausting the connection pool", async () => {
  const original = globalThis.fetch;
  let canceled = false;
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        cancel() {
          canceled = true;
        },
      }),
      { status: 503 },
    );
  try {
    await assert.rejects(async () => {
      for await (const part of modelAnswer(
        "Synthetic question",
        evidence,
        new AbortController().signal,
      ))
        void part;
    }, /HTTP 503/);
    assert.equal(canceled, true);
  } finally {
    globalThis.fetch = original;
  }
});
