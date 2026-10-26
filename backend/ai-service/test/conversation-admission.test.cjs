const { test, after } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env", AI_ENABLED: "false", VISUAL_ENABLED: "false",
  CONVERSATION_AI_ENABLED: "false", DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379", DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088", LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "fixture", LLM_MODEL: "fixture",
});
const llm = require("../dist/infrastructure/integrations/llm.client");
const { config } = require("../dist/config/env.config");
const { admitConversationModel } = require("../dist/modules/conversation-ai/model-admission");
const { ModelMinuteQuotaException } = require("../dist/common/errors/model-quota.exception");
const { TooManyRequestsException } = require("../dist/common/errors/rate-limit.exception");
const timers = require("node:timers/promises");
after(() => require("../dist/infrastructure/database/database").db.end());

test("temporary minute quota waits then admits exactly once, without invoking a provider", async t => {
  let attempts = 0, waits = 0;
  t.mock.method(llm, "admitModel", async (tokens, model) => {
    assert.equal(tokens, 1000); assert.equal(model, "chat");
    if (++attempts === 1) throw new ModelMinuteQuotaException();
  });
  t.mock.method(timers, "setTimeout", async () => { waits++; });
  await admitConversationModel(1000, "chat", new AbortController().signal);
  assert.equal(attempts, 2); assert.equal(waits, 1);
});

test("daily quota and database failures fail immediately without waiting", async t => {
  let next;
  t.mock.method(llm, "admitModel", async () => { throw next; });
  t.mock.method(timers, "setTimeout", async () => assert.fail("must not retry"));
  for (next of [new TooManyRequestsException("daily"), new Error("database")])
    await assert.rejects(admitConversationModel(1000, "chat", new AbortController().signal), error => error === next);
});

test("zero wait budget fails immediately on minute quota", async t => {
  const saved = config.CONVERSATION_AI_QUOTA_WAIT_MS;
  config.CONVERSATION_AI_QUOTA_WAIT_MS = 0;
  t.after(() => { config.CONVERSATION_AI_QUOTA_WAIT_MS = saved; });
  t.mock.method(llm, "admitModel", async () => { throw new ModelMinuteQuotaException(); });
  t.mock.method(timers, "setTimeout", async () => assert.fail("must not wait"));
  await assert.rejects(admitConversationModel(1000, "chat", new AbortController().signal), ModelMinuteQuotaException);
});

test("quota wait ends at its deadline rather than looping indefinitely", async t => {
  let now = 0, attempts = 0;
  t.mock.method(performance, "now", () => now);
  t.mock.method(llm, "admitModel", async () => { attempts++; throw new ModelMinuteQuotaException(); });
  t.mock.method(timers, "setTimeout", async delay => { now += delay; });
  await assert.rejects(admitConversationModel(1000, "chat", new AbortController().signal), ModelMinuteQuotaException);
  assert.equal(now, config.CONVERSATION_AI_QUOTA_WAIT_MS);
  assert.ok(attempts < 40);
});

test("permission revocation cancels quota waiting before the next admission", async t => {
  const controller = new AbortController();
  let attempts = 0;
  t.mock.method(llm, "admitModel", async () => {
    attempts++; throw new ModelMinuteQuotaException();
  });
  t.mock.method(timers, "setTimeout", async (_delay, _value, { signal }) => {
    assert.equal(signal, controller.signal); controller.abort(); signal.throwIfAborted();
  });
  await assert.rejects(admitConversationModel(1000, "chat", controller.signal));
  assert.equal(attempts, 1);
});

test("already cancelled requests cannot reserve model quota", async t => {
  t.mock.method(llm, "admitModel", async () => assert.fail("must not reserve"));
  await assert.rejects(admitConversationModel(1000, "chat", AbortSignal.abort()));
});
