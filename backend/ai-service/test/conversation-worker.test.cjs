const { test, after } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  VISUAL_ENABLED: "false",
  AI_ENABLED: "false",
  CONVERSATION_AI_ENABLED: "true",
  AI_COMMUNICATION_SERVICE_KEY: "fixture-communication-key-not-production-000",
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "fixture",
});
const agent = require("../dist/modules/conversation-ai/conversation-agent");
const { processConversation } = require("../dist/jobs/conversation.processor");
after(() => require("../dist/infrastructure/database/database").db.end());
test("delivery retry reuses persisted answer without another claim or model call", async (t) => {
  let calls = 0,
    claims = 0,
    completes = 0,
    saved;
  t.mock.method(agent, "conversationAnswer", async () => {
    calls++;
    return "completed answer";
  });
  t.mock.method(global, "fetch", async (url) => {
    if (url.endsWith("/claim")) {
      claims++;
      return Response.json({
        data: { question: "hello", token: "fixture-token" },
      });
    }
    if (url.endsWith("/complete")) {
      completes++;
      return completes <= 3
        ? new Response("", { status: 503 })
        : Response.json({ data: { id: "reply" } });
    }
    return Response.json({ data: { valid: true } });
  });
  await assert.rejects(
    processConversation("request", {
      save: async (answer) => {
        saved = answer;
      },
    }),
    /503/,
  );
  assert.equal(saved.content, "completed answer");
  await processConversation("request", {
    answer: saved,
    save: async () => assert.fail("must not regenerate"),
  });
  assert.equal(calls, 1);
  assert.equal(claims, 1);
  assert.equal(completes, 4);
});
test("permission polling aborts an in-progress model request", async (t) => {
  let pulse, saved;
  t.mock.method(global, "setInterval", (run) => {
    pulse = run;
    return {};
  });
  t.mock.method(global, "clearInterval", () => {});
  t.mock.method(global, "fetch", async (url) => {
    if (url.endsWith("/claim"))
      return Response.json({
        data: { question: "private question", token: "fixture-token" },
      });
    return new Response("", { status: 403 });
  });
  t.mock.method(agent, "conversationAnswer", async (_q, _history, signal) => {
    const aborted = new Promise((_, reject) =>
      signal.addEventListener("abort", () => reject(new Error("revoked")), {
        once: true,
      }),
    );
    pulse();
    return aborted;
  });
  await processConversation("request", {
    save: async (answer) => {
      saved = answer;
    },
  });
  assert.equal(saved.failed, true);
});

test("a failed model produces only the safe fallback and persists it before delivery", async (t) => {
  const actions = [];
  t.mock.method(agent, "conversationAnswer", async () => {
    throw new Error("secret provider diagnostics");
  });
  t.mock.method(global, "fetch", async (url, options) => {
    if (url.endsWith("/claim"))
      return Response.json({
        data: { question: "question", token: "claim-token" },
      });
    if (url.endsWith("/complete")) {
      actions.push("deliver");
      const result = JSON.parse(options.body);
      assert.equal(result.failed, true);
      assert.ok(!result.content.includes("secret provider"));
    }
    return Response.json({ data: { id: "reply" } });
  });
  await processConversation("request", {
    save: async (result) => {
      actions.push("save");
      assert.equal(result.failed, true);
    },
  });
  assert.deepEqual(actions, ["save", "deliver"]);
});

test("claim network errors never call the model and revoked delivery never retries", async (t) => {
  let modelCalls = 0,
    attempts = 0;
  t.mock.method(agent, "conversationAnswer", async () => {
    modelCalls++;
    return "answer";
  });
  const fetch = t.mock.method(
    global,
    "fetch",
    async () => new Response(null, { status: 503 }),
  );
  await assert.rejects(processConversation("request"), /503/);
  assert.equal(modelCalls, 0);
  fetch.mock.mockImplementation(async () => {
    attempts++;
    return new Response(null, { status: 403 });
  });
  await processConversation("request", {
    answer: { token: "claim", content: "saved answer", failed: false },
    save: async () => assert.fail("must not save again"),
  });
  assert.equal(attempts, 1);
  assert.equal(modelCalls, 0);
});

test("claim token is durably saved before the provider is called", async (t) => {
  const events = [];
  t.mock.method(global, "fetch", async (url) => {
    if (url.endsWith("/claim"))
      return Response.json({
        data: { question: "hello", token: "claim-token" },
      });
    if (url.endsWith("/complete")) events.push("complete");
    return Response.json({ data: { id: "reply" } });
  });
  t.mock.method(agent, "conversationAnswer", async () => {
    assert.deepEqual(events, ["claim-saved"]);
    events.push("model");
    return "answer";
  });
  await processConversation("request", {
    saveClaim: async (token) => {
      assert.equal(token, "claim-token");
      events.push("claim-saved");
    },
    save: async () => events.push("answer-saved"),
  });
  assert.deepEqual(events, [
    "claim-saved",
    "model",
    "answer-saved",
    "complete",
  ]);
});

test("a restarted job with a saved claim and no answer reports interruption without another provider call", async (t) => {
  let saved;
  const actions = [];
  t.mock.method(agent, "conversationAnswer", async () =>
    assert.fail("unknown provider outcome must not be replayed"),
  );
  t.mock.method(global, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/complete"), "must not claim the request again");
    const body = JSON.parse(options.body);
    assert.equal(body.token, "saved-claim");
    assert.equal(body.failed, true);
    assert.equal(body.content, saved.content);
    actions.push("complete");
    return Response.json({ data: { id: "reply" } });
  });
  await processConversation("request", {
    claimToken: "saved-claim",
    save: async (result) => {
      saved = result;
      actions.push("save");
    },
  });
  assert.equal(saved.failed, true);
  assert.deepEqual(actions, ["save", "complete"]);
});

test("failure to save a claim cannot spend model quota", async (t) => {
  let calls = 0;
  t.mock.method(agent, "conversationAnswer", async () => {
    calls++;
    return "must not run";
  });
  t.mock.method(global, "fetch", async () =>
    Response.json({ data: { question: "hello", token: "claim-token" } }),
  );
  await assert.rejects(
    processConversation("request", {
      saveClaim: async () => {
        throw Error("checkpoint unavailable");
      },
      save: async () => {},
    }),
    /checkpoint unavailable/,
  );
  assert.equal(calls, 0);
});

test("task questions do not expose a task reader or call a task endpoint", async (t) => {
  let saved;
  t.mock.method(global, "fetch", async (url) => {
    assert.ok(!url.endsWith("/tasks"));
    if (url.endsWith("/claim"))
      return Response.json({ data: { question: "my tasks", token: "fixed-claim" } });
    return Response.json({ data: { id: "reply" } });
  });
  t.mock.method(agent, "conversationAnswer", async (...args) => {
    assert.equal(args.length, 4);
    return "Task lookup in chat is unavailable";
  });
  await processConversation("request", {
    save: async (answer) => { saved = answer; },
  });
  assert.equal(saved.failed, false);
  assert.match(saved.content, /unavailable/);
});

test("attachment requests take the document path and reuse the same protected completion checkpoint", async t => {
  const summaries = require("../dist/modules/conversation-ai/attachment-summary");
  let saved, attachmentReads = 0;
  t.mock.method(agent, "conversationAnswer", async () => assert.fail("must not read conversation history"));
  t.mock.method(summaries, "summarizeAttachment", async (id, read, authorize, signal) => {
    assert.equal(id, "request"); await authorize();
    assert.equal((await read()).name, "fixture.txt");
    assert.equal(signal.aborted, false);
    return "Tóm tắt fixture";
  });
  t.mock.method(global, "fetch", async (url, options) => {
    if (url.endsWith("/claim")) return Response.json({ data: { question: "summarize", token: "token", attachmentSummary: true } });
    if (url.endsWith("/attachment")) { attachmentReads++; return Response.json({ data: { name: "fixture.txt" } }); }
    if (url.endsWith("/complete")) assert.equal(JSON.parse(options.body).content, saved.content);
    return Response.json({ data: { valid: true } });
  });
  await processConversation("request", { save: async answer => { saved = answer; } });
  assert.equal(saved.failed, false);
  assert.equal(attachmentReads, 1);
});

test("unreadable attachment gives a useful error without private diagnostics", async t => {
  const summaries = require("../dist/modules/conversation-ai/attachment-summary");
  const { BadRequestException } = require("@nestjs/common");
  let saved;
  t.mock.method(summaries, "summarizeAttachment", async () => { throw new BadRequestException("PDF có mật khẩu."); });
  t.mock.method(global, "fetch", async url => url.endsWith("/claim")
    ? Response.json({ data: { question: "summary", token: "token", attachmentSummary: true } })
    : Response.json({ data: { id: "reply" } }));
  await processConversation("request", { save: async answer => { saved = answer; } });
  assert.equal(saved.failed, true);
  assert.match(saved.content, /PDF có mật khẩu/);
});
