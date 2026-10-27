const { test, after } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  VISUAL_ENABLED: "false",
  AI_ENABLED: "false",
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "fixture",
});
const llm = require("../dist/infrastructure/integrations/llm.client");
llm.admitModel = async () => {};
const { ChatOpenAI } = require("@langchain/openai");
const { AIMessage } = require("@langchain/core/messages");
const {
  conversationAnswer,
} = require("../dist/modules/conversation-ai/conversation-agent");

after(() => require("../dist/infrastructure/database/database").db.end());
test("general questions do not read history", async (t) => {
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async () => new AIMessage("General answer"),
  }));
  let reads = 0;
  assert.equal(
    await conversationAnswer(
      "How do I sleep well?",
      async () => {
        reads++;
        return [];
      },
      new AbortController().signal,
    ),
    "General answer",
  );
  assert.equal(reads, 0);
});
test("summary reads once and tool follow-up reuses history", async (t) => {
  let calls = 0,
    reads = 0;
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async (messages) => {
      if (!calls++)
        return new AIMessage({
          content: "",
          tool_calls: [
            {
              name: "get_recent_messages",
              args: {},
              id: "fixture-call",
              type: "tool_call",
            },
          ],
        });
      assert.ok(messages.some((m) => m.getType() === "tool"));
      return new AIMessage("Summary");
    },
  }));
  assert.equal(
    await conversationAnswer(
      "summarize the conversation",
      async () => {
        reads++;
        return [{ content: "Meeting at nine" }];
      },
      new AbortController().signal,
    ),
    "Summary",
  );
  assert.equal(reads, 1);
});
test("denied history never reaches provider for explicit summary", async (t) => {
  let calls = 0;
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => {
    calls++;
    throw Error("unexpected");
  });
  await assert.rejects(
    conversationAnswer(
      "summarize conversation",
      async () => {
        throw Error("revoked");
      },
      new AbortController().signal,
    ),
    /revoked/,
  );
  assert.equal(calls, 0);
});

test("permission revocation stops the next model call even with cached history", async (t) => {
  let calls = 0;
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async () => {
      if (!calls++)
        return new AIMessage({
          content: "",
          tool_calls: [
            {
              name: "get_recent_messages",
              args: {},
              id: "call",
              type: "tool_call",
            },
          ],
        });
      return new AIMessage("must not be sent");
    },
  }));
  await assert.rejects(
    conversationAnswer(
      "What did people agree?",
      async () => [{ content: "private" }],
      new AbortController().signal,
      async () => {
        if (calls) throw Error("revoked");
      },
    ),
    /revoked/,
  );
  assert.equal(calls, 1);
});

test("a negated summary instruction does not force a history read", async (t) => {
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async () => new AIMessage("General help"),
  }));
  let reads = 0;
  assert.equal(
    await conversationAnswer(
      "Do not summarize conversation; explain what you can do.",
      async () => {
        reads++;
        return [];
      },
      new AbortController().signal,
    ),
    "General help",
  );
  assert.equal(reads, 0);
});
test("an empty explicit summary does not spend model quota", async (t) => {
  t.mock.method(ChatOpenAI.prototype, "bindTools", () =>
    assert.fail("must not call model"),
  );
  assert.match(
    await conversationAnswer(
      "tóm tắt hội thoại",
      async () => [],
      new AbortController().signal,
    ),
    /Chưa có tin nhắn/,
  );
});

test("rejects tools that attempt to choose a different chat or request", async (t) => {
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async () =>
      new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "get_recent_messages",
            args: { chatId: "other-private-chat" },
            id: "call",
            type: "tool_call",
          },
        ],
      }),
  }));
  let reads = 0;
  await assert.rejects(
    conversationAnswer(
      "What was said?",
      async () => {
        reads++;
        return [];
      },
      new AbortController().signal,
    ),
  );
  assert.equal(reads, 0);
});

test("rejects unknown tools and bounds repeated tool calls", async (t) => {
  let reads = 0,
    calls = 0;
  const mock = t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async () =>
      new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "unsafe_database_query",
            args: {},
            id: "call",
            type: "tool_call",
          },
        ],
      }),
  }));
  await assert.rejects(
    conversationAnswer(
      "question",
      async () => {
        reads++;
        return [];
      },
      new AbortController().signal,
    ),
    /Unknown tool/,
  );
  assert.equal(reads, 0);
  mock.mock.mockImplementation(() => ({
    invoke: async () => {
      calls++;
      return new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "get_recent_messages",
            args: {},
            id: "call-" + calls,
            type: "tool_call",
          },
        ],
      });
    },
  }));
  await assert.rejects(
    conversationAnswer(
      "question",
      async () => {
        reads++;
        return [];
      },
      new AbortController().signal,
    ),
    /Tool limit/,
  );
  assert.equal(calls, 3);
  assert.equal(reads, 1);
});

test("rejects empty, oversized and truncated model answers", async (t) => {
  let next;
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async () => next,
  }));
  for (const content of ["", "   ", "x".repeat(20001)]) {
    next = new AIMessage(content);
    await assert.rejects(
      conversationAnswer(
        "question",
        async () => [],
        new AbortController().signal,
      ),
      /Invalid answer/,
    );
  }
  next = new AIMessage({
    content: "unfinished",
    response_metadata: { finish_reason: "length" },
  });
  await assert.rejects(
    conversationAnswer(
      "question",
      async () => [],
      new AbortController().signal,
    ),
    /Truncated answer/,
  );
});

test("an already cancelled request never reads history or calls the provider", async (t) => {
  t.mock.method(ChatOpenAI.prototype, "bindTools", () =>
    assert.fail("provider must not be called"),
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    conversationAnswer(
      "summarize conversation",
      async () => assert.fail("history must not be read"),
      controller.signal,
    ),
  );
});

test("prefetched or previously read history disables further tool requests", async (t) => {
  const choices = [];
  let calls = 0;
  const mock = t.mock.method(
    ChatOpenAI.prototype,
    "bindTools",
    (_tools, options) => {
      choices.push(options?.tool_choice);
      return { invoke: async () => new AIMessage("Summary") };
    },
  );
  await conversationAnswer(
    "summarize conversation",
    async () => [{ content: "Meeting at nine" }],
    new AbortController().signal,
  );
  assert.deepEqual(choices, ["none"]);
  choices.length = 0;
  mock.mock.mockImplementation((_tools, options) => {
    choices.push(options?.tool_choice);
    return {
      invoke: async () =>
        calls++ === 0
          ? new AIMessage({
              content: "",
              tool_calls: [
                {
                  name: "get_recent_messages",
                  args: {},
                  id: "history",
                  type: "tool_call",
                },
              ],
            })
          : new AIMessage("Decision"),
    };
  });
  await conversationAnswer(
    "What was decided?",
    async () => [{ content: "Meeting at nine" }],
    new AbortController().signal,
  );
  assert.deepEqual(choices, ["auto", "none"]);
});

test("explicit summaries present prefetched history as an executed tool result", async (t) => {
  let providerCalls = 0;
  t.mock.method(ChatOpenAI.prototype, "bindTools", (_tools, options) => ({
    invoke: async (messages) => {
      providerCalls++;
      const call = messages.find(
        (message) =>
          message.getType() === "ai" &&
          message.tool_calls?.some(
            (tool) => tool.name === "get_recent_messages",
          ),
      );
      assert.ok(
        call,
        "the provider must see a completed history tool call, not an extra user message",
      );
      const result = messages.find(
        (message) =>
          message.getType() === "tool" &&
          message.tool_call_id === call.tool_calls[0].id,
      );
      assert.ok(result);
      assert.match(result.content, /trusted synthetic meeting fact/);
      assert.equal(options.tool_choice, "none");
      return new AIMessage("Summary");
    },
  }));
  assert.equal(
    await conversationAnswer(
      "summarize conversation",
      async () => [{ content: "trusted synthetic meeting fact" }],
      new AbortController().signal,
    ),
    "Summary",
  );
  assert.equal(providerCalls, 1);
});

const { config } = require("../dist/config/env.config");
test("conversation model and output budget are independent from Notebook", async (t) => {
  const originalModel = config.CONVERSATION_AI_MODEL;
  const originalBudget = config.CONVERSATION_AI_MAX_TOKENS;
  const notebookModel = config.LLM_MODEL;
  const notebookBudget = config.LLM_MAX_TOKENS;
  const admissions = [];
  config.CONVERSATION_AI_MODEL = "conversation-fixture";
  config.CONVERSATION_AI_MAX_TOKENS = 1024;
  t.mock.method(llm, "admitModel", async (...args) => admissions.push(args));
  t.mock.method(ChatOpenAI.prototype, "bindTools", function () {
    assert.equal(this.model, "conversation-fixture");
    assert.equal(this.maxTokens, 1024);
    return {
      invoke: async (messages) => {
        const reserved =
          Math.ceil(Buffer.byteLength(JSON.stringify(messages)) / 3) + 1024;
        assert.deepEqual(admissions, [[reserved, "conversation-fixture"]]);
        return new AIMessage("Short answer");
      },
    };
  });
  try {
    assert.equal(
      await conversationAnswer(
        "Question",
        async () => [],
        new AbortController().signal,
      ),
      "Short answer",
    );
    assert.equal(config.LLM_MODEL, notebookModel);
    assert.equal(config.LLM_MAX_TOKENS, notebookBudget);
  } finally {
    config.CONVERSATION_AI_MODEL = originalModel;
    config.CONVERSATION_AI_MAX_TOKENS = originalBudget;
  }
});

test("unconfigured conversation overrides preserve the existing model and budget", async (t) => {
  const originalModel = config.CONVERSATION_AI_MODEL;
  const originalBudget = config.CONVERSATION_AI_MAX_TOKENS;
  delete config.CONVERSATION_AI_MODEL;
  delete config.CONVERSATION_AI_MAX_TOKENS;
  t.mock.method(llm, "admitModel", async (_tokens, model) =>
    assert.equal(model, config.LLM_MODEL),
  );
  t.mock.method(ChatOpenAI.prototype, "bindTools", function () {
    assert.equal(this.model, config.LLM_MODEL);
    assert.equal(this.maxTokens, config.LLM_MAX_TOKENS);
    return { invoke: async () => new AIMessage("Fallback answer") };
  });
  try {
    assert.equal(
      await conversationAnswer(
        "Question",
        async () => [],
        new AbortController().signal,
      ),
      "Fallback answer",
    );
  } finally {
    config.CONVERSATION_AI_MODEL = originalModel;
    config.CONVERSATION_AI_MAX_TOKENS = originalBudget;
  }
});

for (const fixture of [
  { utc: "2026-10-23T17:05:00.000Z", local: "Saturday, 24/10/2026, 00:05:00" },
  { utc: "2026-12-31T17:05:00.000Z", local: "Friday, 01/01/2027, 00:05:00" },
]) {
  test(`current date comes from the Vietnam clock across UTC boundary ${fixture.utc}`, async (t) => {
    t.mock.timers.enable({
      apis: ["Date"],
      now: new Date(fixture.utc).getTime(),
    });
    t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
      invoke: async (messages) => {
        const system = messages.find(
          (message) => message.getType() === "system",
        ).content;
        assert.ok(
          system.includes(fixture.local),
          "system context must contain the correct local date, weekday and time",
        );
        assert.match(system, /Asia\/Ho_Chi_Minh/);
        return new AIMessage("Current date");
      },
    }));
    await conversationAnswer(
      "What date is today?",
      async () => assert.fail("clock questions must not require chat history"),
      new AbortController().signal,
    );
  });
}

test("clock context is refreshed for each request rather than cached at startup", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-24T16:59:00.000Z").getTime(),
  });
  const contexts = [];
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async (messages) => {
      contexts.push(
        messages.find((message) => message.getType() === "system").content,
      );
      return new AIMessage("Current date");
    },
  }));
  const answer = () =>
    conversationAnswer(
      "What date is today?",
      async () => [],
      new AbortController().signal,
    );
  await answer();
  t.mock.timers.setTime(new Date("2026-10-24T17:01:00.000Z").getTime());
  await answer();
  assert.ok(contexts[0].includes("Saturday, 24/10/2026, 23:59:00"));
  assert.ok(contexts[1].includes("Sunday, 25/10/2026, 00:01:00"));
});

test("assigned task questions have no Project lookup tool", async (t) => {
  t.mock.method(ChatOpenAI.prototype, "bindTools", (tools) => ({
    invoke: async (messages) => {
      assert.deepEqual(tools.map((tool) => tool.name), ["get_recent_messages"]);
      assert.match(messages[0].content, /task lookup in chat is unavailable/);
      return new AIMessage("Task lookup in chat is unavailable.");
    },
  }));
  assert.equal(
    await conversationAnswer(
      "My tasks today",
      async () => assert.fail("must not infer assignments from chat"),
      new AbortController().signal,
    ),
    "Task lookup in chat is unavailable.",
  );
});
