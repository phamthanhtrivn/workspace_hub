const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { randomUUID } = require("node:crypto");
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
const workers = [];
class FakeQueue extends EventEmitter {
  jobs = new Map();
  added = [];
  async getJob(id) {
    return this.jobs.get(id);
  }
  async add(kind, data, { jobId }) {
    this.added.push({ kind, data, jobId });
    if (this.jobs.has(jobId)) return this.jobs.get(jobId);
    return this.fixture(jobId, "waiting");
  }
  fixture(id, state) {
    const job = {
      getState: async () => state,
      remove: async () => this.jobs.delete(id),
    };
    this.jobs.set(id, job);
    return job;
  }
  async close() {}
}
class FakeWorker extends EventEmitter {
  running = false;
  constructor(name, processor, options) {
    super();
    Object.assign(this, { name, processor, options });
    workers.push(this);
  }
  isRunning() {
    return this.running;
  }
  run() {
    this.running = true;
    return new Promise((resolve) => {
      this.stopped = resolve;
    });
  }
  async close() {
    this.running = false;
    this.stopped?.();
  }
}
const realBull = require("bullmq");
require.cache[require.resolve("bullmq")].exports = {
  ...realBull,
  Queue: FakeQueue,
  Worker: FakeWorker,
};
const {
  queue,
  summaryQueue,
  enqueue,
  findQueuedJob,
  closeQueues,
} = require("../dist/infrastructure/queue/notebook.queue");
const { config } = require("../dist/config/env.config");
const database = require("../dist/infrastructure/database/database");
const { profiled } = require("../dist/common/profiling/pipeline-profiler");
after(async () => {
  await closeQueues();
  await database.db.end();
});

test("new summaries are routed away from index jobs while duplicate IDs remain idempotent", async () => {
  const id = randomUUID();
  await enqueue("summary", id, { artifactId: id });
  await enqueue("index", id, { sourceId: id });
  assert.ok(await summaryQueue.getJob(`summary-${id}`));
  assert.equal(await queue.getJob(`summary-${id}`), undefined);
  assert.ok(await queue.getJob(`index-${id}`));
  await enqueue("summary", id, { artifactId: id });
  assert.equal(
    [...summaryQueue.jobs.keys()].filter((key) => key === `summary-${id}`)
      .length,
    1,
  );
});

test("legacy queued/active summaries are not replayed into the new queue and recovery finds both", async () => {
  for (const state of ["active", "waiting", "delayed", "waiting-children"]) {
    const id = randomUUID();
    const legacy = queue.fixture(`summary-${id}`, state);
    await enqueue("summary", id, {});
    assert.equal(await summaryQueue.getJob(`summary-${id}`), undefined);
    assert.equal(await findQueuedJob("summary", id), legacy);
  }
  for (const state of ["failed", "completed"]) {
    const id = randomUUID();
    queue.fixture(`summary-${id}`, state);
    const previous = summaryQueue.fixture(`summary-${id}`, state);
    await enqueue("summary", id, {});
    assert.notEqual(await findQueuedJob("summary", id), previous);
    assert.equal(
      await (await findQueuedJob("summary", id)).getState(),
      "waiting",
    );
  }
});

test("disabled AI does not enqueue new work", async () => {
  config.AI_ENABLED = "false";
  try {
    const before = queue.added.length + summaryQueue.added.length;
    await enqueue("index", randomUUID(), {});
    await enqueue("summary", randomUUID(), {});
    assert.equal(queue.added.length + summaryQueue.added.length, before);
  } finally {
    config.AI_ENABLED = "true";
  }
});

test("profiling records elapsed stages and errors without logging error bodies", async (t) => {
  const reports = [];
  t.mock.method(console, "info", (line) => reports.push(JSON.parse(line)));
  await profiled("preflight", async (timing) => {
    timing.set("attempt", Infinity);
    await timing.measure("rag_ms", async () => {});
  });
  await assert.rejects(
    profiled("index", async (timing) =>
      timing.measure("download_ms", async () => {
        throw new Error("secret presigned URL or document body");
      }),
    ),
  );
  assert.equal(reports[0].status, "ok");
  assert.equal(reports[1].status, "failed");
  assert.ok(reports.every((r) => r.total_ms >= 0));
  assert.ok(reports[1].download_ms >= 0);
  assert.equal(reports[0].attempt, undefined);
  assert.doesNotMatch(JSON.stringify(reports), /secret|presigned/);
});

test("preflight sends server-selected notebook scope and exact bytes to the authenticated RAG endpoint", async (t) => {
  const scopeId = randomUUID();
  t.mock.method(console, "info", () => {});
  t.mock.method(global, "fetch", async (url, options) => {
    assert.equal(url, "http://localhost:8088/validate");
    assert.equal(
      options.headers["x-internal-service-key"],
      process.env.RAG_SERVICE_KEY,
    );
    const data = JSON.parse(options.body);
    assert.equal(data.scopeId, scopeId);
    assert.equal(data.name, "a.txt");
    assert.equal(
      Buffer.from(data.content, "base64").toString(),
      "original bytes",
    );
    return Response.json({ chunkCount: 1 });
  });
  assert.deepEqual(
    await require("../dist/modules/sources/upload-validation").validateContent(
      "a.txt",
      Buffer.from("original bytes"),
      scopeId,
    ),
    { chunkCount: 1 },
  );
});

test("index lane completes while summary lane is waiting; heartbeat requires both lanes and shutdown closes both", async (t) => {
  const timers = [];
  t.mock.method(global, "setInterval", (run, ms) => {
    const timer = { run, ms };
    timers.push(timer);
    return timer;
  });
  t.mock.method(global, "clearInterval", () => {});
  const reports = [];
  t.mock.method(console, "info", (line) => reports.push(JSON.parse(line)));
  const originalRows = database.rows;
  let databaseClosed = 0;
  t.mock.method(database.db, "end", async () => {
    databaseClosed++;
  });
  database.rows = async () => [];
  t.after(() => {
    database.rows = originalRows;
  });
  let heartbeats = 0;
  queue.client = Promise.resolve({
    set: async (_key, value, opts) => {
      assert.equal(value, "ready:split-v1");
      assert.equal(opts.EX, 45);
      heartbeats++;
    },
  });
  const previousHandlers = process.listeners("SIGTERM");
  require("../dist/worker");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    workers.map((worker) => worker.name),
    ["notebook-jobs", "notebook-summary-jobs"],
  );
  assert.ok(
    workers.every(
      (worker) => worker.options.concurrency === 1 && worker.running,
    ),
  );
  let release;
  database.rows = async (sql) =>
    sql.includes("SELECT a.*,n.owner_id")
      ? new Promise((resolve) => {
          release = resolve;
        })
      : [];
  const job = (name, attemptsMade = 0) => ({
    name,
    data: { sourceId: randomUUID(), artifactId: randomUUID() },
    timestamp: Date.now() - 50,
    attemptsMade,
  });
  const waitingSummary = workers[1].processor(job("summary"));
  assert.ok(release);
  await workers[0].processor(job("index"));
  assert.equal(reports.find((r) => r.operation === "job_index").status, "ok");
  assert.equal(
    reports.find((r) => r.operation === "job_summary"),
    undefined,
  );
  release([]);
  await waitingSummary;
  await workers[0].processor(job("index", 1));
  const retry = reports.filter((r) => r.operation === "job_index").at(-1);
  assert.equal(retry.attempt, 2);
  assert.equal(retry.queue_wait_ms, undefined);
  const heartbeat = timers.find((timer) => timer.ms === 10000);
  heartbeat.run();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(heartbeats, 1);
  workers[1].running = false;
  heartbeat.run();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(heartbeats, 1);
  workers[1].running = true;
  const shutdown = process
    .listeners("SIGTERM")
    .find((handler) => !previousHandlers.includes(handler));
  shutdown();
  shutdown();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(workers.every((worker) => !worker.running));
  assert.equal(databaseClosed, 1);
});
