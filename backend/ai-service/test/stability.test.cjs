const { test } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, {
  AI_ENABLED: "true",
  NODE_ENV: "test",
  DOTENV_CONFIG_PATH: "test/no-env-file",
  AI_GATEWAY_KEY: "fixture-gateway-proof-not-production-000",
  AI_DOCUMENT_SERVICE_KEY: "fixture-ai-document-not-production-000",
  RAG_SERVICE_KEY: "fixture-rag-service-not-production-000",
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "test-only",
  LLM_MODEL: "fixture",
});
const database = require("../dist/infrastructure/database/database");
let jobs = new Map();
require.cache[require.resolve("../dist/infrastructure/queue/notebook.queue")] =
  {
    exports: {
      findQueuedJob: async (kind, id) =>
        jobs.has(`${kind}-${id}`)
          ? { getState: async () => jobs.get(`${kind}-${id}`) }
          : undefined,
      queue: {
        getJob: async (id) =>
          jobs.has(id) ? { getState: async () => jobs.get(id) } : undefined,
      },
    },
  };
const { recoverInterruptedJobs } = require("../dist/jobs/job-recovery");
const {
  checkHttpDependencies,
} = require("../dist/common/health/http-dependencies");
const documents = require("../dist/infrastructure/integrations/document.client");
const { SourcesService } = require("../dist/modules/sources/sources.service");
const {
  ForbiddenException,
  ServiceUnavailableException,
} = require("@nestjs/common");

test("source checks batch all-valid permissions without caching and fall back only on revocation", async (t) => {
  const original = documents.authorizeSources;
  t.after(() => {
    documents.authorizeSources = original;
  });
  const sourcesService = new SourcesService();
  const sources = Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    status: "READY",
    error: null,
  }));
  sourcesService.sources = async () => sources.map((s) => ({ ...s }));
  let calls = 0;
  documents.authorizeSources = async () => {
    calls++;
    return [];
  };
  assert.equal((await sourcesService.checkedSources({}, "notebook")).length, 5);
  assert.equal(calls, 1);
  await sourcesService.checkedSources({}, "notebook");
  assert.equal(calls, 2, "Permissions must be checked on every read");
  calls = 0;
  documents.authorizeSources = async (_, selected) => {
    calls++;
    if (selected.some((s) => s.id === "2")) throw new ForbiddenException();
    return [];
  };
  const checked = await sourcesService.checkedSources({}, "notebook");
  assert.equal(calls, 6);
  assert.deepEqual(
    checked.map((s) => s.status),
    ["READY", "READY", "UNAVAILABLE", "READY", "READY"],
  );
  calls = 0;
  documents.authorizeSources = async () => {
    calls++;
    throw new ServiceUnavailableException();
  };
  await assert.rejects(
    sourcesService.checkedSources({}, "notebook"),
    (e) => e.getStatus() === 503,
  );
  assert.equal(
    calls,
    1,
    "Dependency failures must not trigger a request fan-out",
  );
});

test("readiness requires working RAG and authenticated Document validation, not merely HTTP liveness", async (t) => {
  const original = global.fetch;
  t.after(() => {
    global.fetch = original;
  });
  for (const [ragStatus, docStatus, accepted] of [
    [200, 400, true],
    [503, 400, false],
    [200, 401, false],
    [200, 404, false],
    [200, 200, false],
  ]) {
    global.fetch = async (url, options) => {
      const isRag = url.includes(":8088");
      assert.equal(
        options.headers["x-internal-service-key"],
        isRag
          ? process.env.RAG_SERVICE_KEY
          : process.env.AI_DOCUMENT_SERVICE_KEY,
      );
      assert.equal(options.redirect, "error");
      return new Response("{}", { status: isRag ? ragStatus : docStatus });
    };
    if (accepted) await checkHttpDependencies();
    else await assert.rejects(checkHttpDependencies());
  }
  global.fetch = async () => {
    throw new Error("connection refused");
  };
  await assert.rejects(checkHttpDependencies());
});

test("recovery marks abandoned jobs failed but never steals active/waiting work or replays provider calls", async (t) => {
  const original = database.rows;
  t.after(async () => {
    database.rows = original;
    await database.db.end();
  });
  const candidates = [
    "missing",
    "failed",
    "completed",
    "active",
    "waiting",
    "delayed",
    "unknown",
  ].flatMap((state) => [
    { id: `${state}-source`, kind: "index" },
    { id: `${state}-artifact`, kind: "summary" },
  ]);
  jobs = new Map(
    candidates
      .filter((c) => !c.id.startsWith("missing"))
      .map((c) => [`${c.kind}-${c.id}`, c.id.split("-")[0]]),
  );
  const updates = [];
  database.rows = async (sql, args) => {
    if (sql.includes("UNION ALL")) return candidates;
    updates.push({ sql, args });
    return [];
  };
  await recoverInterruptedJobs();
  assert.equal(updates.length, 8);
  assert.ok(updates.every((u) => !/active|waiting|delayed/.test(u.args[0])));
  assert.ok(
    updates.every(
      (u) =>
        u.sql.includes("updated_at<now()-interval") &&
        u.sql.includes("status='"),
    ),
  );
  assert.ok(updates.some((u) => u.args[1].startsWith("SUMMARY_INTERRUPTED")));
});

test("meeting readiness requires the authenticated local speech worker and no Google service", async (t) => {
  const { config } = require("../dist/config/env.config");
  const previous = config.MEETING_SUMMARY_ENABLED;
  config.MEETING_SUMMARY_ENABLED = "true";
  t.after(() => {
    config.MEETING_SUMMARY_ENABLED = previous;
  });
  let speechStatus = 200;
  t.mock.method(global, "fetch", async (url, options) => {
    if (url.includes(":8090")) {
      assert.equal(
        options.headers["x-internal-service-key"],
        config.MEETING_STT_SERVICE_KEY,
      );
      return new Response("{}", { status: speechStatus });
    }
    return new Response("{}", { status: url.includes(":8088") ? 200 : 400 });
  });
  await checkHttpDependencies();
  speechStatus = 503;
  await assert.rejects(checkHttpDependencies());
});
