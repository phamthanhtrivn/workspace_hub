const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fixture = require("../evaluation/workspace.json");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  NODE_ENV: "test",
  AI_ENABLED: "false",
  VISUAL_ENABLED: "false",
  MEETING_SUMMARY_ENABLED: "false",
  CONVERSATION_AI_ENABLED: "false",
  WORK_ASSISTANT_SERVICE_KEY: "fixture-work-assistant-not-production-00000",
  WORK_ASSISTANT_PROJECT_URL: "http://project.fixture.invalid",
  WORK_ASSISTANT_CALENDAR_URL: "http://calendar.fixture.invalid",
  DATABASE_URL: "postgres://fixture:fixture@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "fixture",
});
require.cache[require.resolve("../dist/infrastructure/queue/notebook.queue")] = { exports: { enqueue: async () => {} } };
const { WorkContextService } = require("../dist/modules/work-assistant/work-context");
const { StudioService } = require("../dist/modules/studio/studio.service");
const database = require("../dist/infrastructure/database/database");
const { config } = require("../dist/config/env.config");
after(() => database.db.end());

test("timezone refetch propagates Project revocation instead of reporting unavailable data", async (t) => {
  let projectReads = 0;
  t.mock.method(global, "fetch", async (url) => {
    if (url.endsWith("/authorize")) return Response.json({ data: { projectIds: [fixture.projectId] } });
    if (url.includes("project.fixture.invalid")) {
      projectReads++;
      return projectReads === 1 ? Response.json({ data: fixture.project }) : new Response(null, { status: 403 });
    }
    return Response.json({ data: { ...fixture.calendar, timeZone: "America/New_York" } });
  });
  await assert.rejects(
    new WorkContextService().read(fixture.actor, { projectId: fixture.projectId, audience: "project" }),
    (error) => error.getStatus() === 403,
  );
  assert.equal(projectReads, 2);
});

test("Studio summary cache partitions provider, effective model and output token budget", async (t) => {
  const initial = { provider: config.LLM_BASE_URL, model: config.LLM_MODEL, tokens: config.LLM_MAX_TOKENS };
  t.after(() => Object.assign(config, { LLM_BASE_URL: initial.provider, LLM_MODEL: initial.model, LLM_MAX_TOKENS: initial.tokens }));
  const keys = [];
  t.mock.method(database, "rows", async (sql, args) => {
    if (sql.startsWith("INSERT INTO notebook_ai.artifacts")) {
      keys.push(args[3]);
      return [{ id: args[0], status: "COMPLETED" }];
    }
    return [{ id: "notebook" }];
  });
  const service = new StudioService({ checkedSources: async () => [{ id: "source", revision: "r1", status: "READY" }] });
  const run = () => service.artifact({ id: "owner", email: "owner@example.test" }, "notebook", "SUMMARY");
  await run();
  config.LLM_BASE_URL = initial.provider + "/";
  await run();
  assert.equal(keys[0], keys[1], "Trailing slash must not invalidate an identical provider");
  config.LLM_BASE_URL = "https://another-provider.invalid/v1";
  await run();
  assert.notEqual(keys[1], keys[2], "Different providers must not reuse prior artifacts");
  config.LLM_MODEL = "another-model";
  await run();
  assert.notEqual(keys[2], keys[3], "Use the effective model config, not process.env");
  config.LLM_MAX_TOKENS = 512;
  await run();
  assert.notEqual(keys[3], keys[4], "Changing the output budget must partition the cache");
});
