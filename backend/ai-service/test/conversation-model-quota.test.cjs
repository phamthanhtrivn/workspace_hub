const { test, after } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  AI_ENABLED: "false",
  CONVERSATION_AI_ENABLED: "false",
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "notebook-fixture",
});
const database = require("../dist/infrastructure/database/database");
const { config } = require("../dist/config/env.config");
const {
  admitModel,
} = require("../dist/infrastructure/integrations/llm.client");
const {
  ModelMinuteQuotaException,
} = require("../dist/common/errors/model-quota.exception");
const {
  TooManyRequestsException,
} = require("../dist/common/errors/rate-limit.exception");
after(() => database.db.end());

for (const explicit of [false, true]) {
  test(`quota admission uses ${explicit ? "conversation override" : "Notebook default"} model`, async (t) => {
    const queries = [];
    t.mock.method(database, "transaction", async (run) =>
      run({
        query: async (sql, args) => {
          queries.push([sql, args]);
          return { rows: [{ rpm: 0, tokens: 0, daily: 0 }] };
        },
      }),
    );
    if (explicit) await admitModel(2048, "conversation-fixture");
    else await admitModel(4096);
    const expected = explicit ? "conversation-fixture" : config.LLM_MODEL;
    assert.deepEqual(queries[1][1], [expected]);
    assert.equal(queries[2][1][1], expected);
    assert.equal(queries[2][1][2], explicit ? 2048 : 4096);
  });
}

test("conversation override still rejects exhausted minute and daily quotas before insertion", async (t) => {
  let usage;
  let inserted = false;
  t.mock.method(database, "transaction", async (run) =>
    run({
      query: async (sql, args) => {
        if (sql.startsWith("INSERT")) inserted = true;
        if (sql.includes("WHERE model=$1"))
          assert.deepEqual(args, ["conversation-fixture"]);
        return { rows: [usage] };
      },
    }),
  );
  usage = { rpm: config.LLM_REQUESTS_PER_MINUTE, tokens: 0, daily: 0 };
  await assert.rejects(
    admitModel(2048, "conversation-fixture"),
    ModelMinuteQuotaException,
  );
  usage = { rpm: 0, tokens: 0, daily: config.LLM_REQUESTS_PER_DAY };
  await assert.rejects(
    admitModel(2048, "conversation-fixture"),
    TooManyRequestsException,
  );
  assert.equal(inserted, false);
});
