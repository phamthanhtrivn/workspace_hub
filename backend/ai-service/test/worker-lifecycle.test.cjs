const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
let workers, recover, closeJobs, endDb, writeHeartbeat;
const config = { AI_ENABLED: "true", AI_SHUTDOWN_TIMEOUT_MS: 5000 };
class FakeWorker extends EventEmitter {
  running = false;
  closeGate = Promise.resolve();
  constructor(name) {
    super();
    this.name = name;
    workers.push(this);
  }
  isRunning() {
    return this.running;
  }
  run() {
    this.running = true;
    this.runCalls = (this.runCalls || 0) + 1;
    return Promise.resolve();
  }
  async close() {
    this.running = false;
    await this.closeGate;
    this.closed = true;
  }
}
require.cache[require.resolve("bullmq")] = { exports: { Worker: FakeWorker } };
for (const [file, exports] of [
  ["config/env.config", { config, connection: {} }],
  ["infrastructure/database/database", { db: { end: () => endDb() } }],
  [
    "infrastructure/queue/notebook.queue",
    {
      queue: {
        client: Promise.resolve({ set: (...args) => writeHeartbeat(...args) }),
      },
      closeQueues: () => closeJobs(),
      WORKER_HEARTBEAT_VALUE: "ready:split-v1",
    },
  ],
  ["jobs/job-recovery", { reconcileQueuedJobs: (...args) => recover(...args) }],
  ["jobs/conversation.processor", { processConversation: async () => {} }],
  ["jobs/meeting-summary.processor", { processMeetingSummary: async () => {} }],
  ["jobs/index.processor", { indexSource: async () => {} }],
  ["jobs/summary.processor", { summarize: async () => {} }],
  ["infrastructure/integrations/rag.client", { rag: async () => {} }],
])
  require.cache[require.resolve(`../dist/${file}`)] = { exports };
const { startWorkers } = require("../dist/jobs/jobs.runner");

function start(t) {
  workers = [];
  const timers = [];
  t.mock.method(global, "setInterval", (run, ms) => {
    const timer = { run, ms };
    timers.push(timer);
    return timer;
  });
  t.mock.method(global, "clearInterval", (timer) => {
    timer.cleared = true;
  });
  const previous = new Set([
    ...process.listeners("SIGTERM"),
    ...process.listeners("SIGINT"),
  ]);
  startWorkers();
  const shutdown = process
    .listeners("SIGTERM")
    .find((handler) => !previous.has(handler));
  t.after(() => {
    for (const signal of ["SIGTERM", "SIGINT"])
      for (const handler of process.listeners(signal))
        if (!previous.has(handler)) process.removeListener(signal, handler);
  });
  return { shutdown, timers };
}

test("shutdown during startup waits for recovery and never starts workers afterwards", async (t) => {
  const gate = deferred();
  let calls = 0,
    recoverySignal,
    queueClosed = 0,
    dbClosed = 0;
  recover = (_meetings, signal) => {
    calls++;
    recoverySignal = signal;
    return gate.promise;
  };
  closeJobs = async () => {
    queueClosed++;
  };
  endDb = async () => {
    dbClosed++;
  };
  const { shutdown, timers } = start(t);
  timers.find((timer) => timer.ms === 30000).run();
  assert.equal(calls, 1, "Startup recovery must exclude periodic sweeps");
  const stopping = shutdown();
  assert.equal(shutdown(), stopping);
  assert.equal(recoverySignal.aborted, true);
  await tick();
  assert.equal(queueClosed, 0);
  assert.equal(dbClosed, 0);
  gate.resolve();
  await stopping;
  assert.ok(workers.every((worker) => !worker.runCalls && worker.closed));
  assert.ok(timers.every((timer) => timer.cleared));
  assert.equal(queueClosed, 1);
  assert.equal(dbClosed, 1);
});

test("shutdown drains workers, recovery and heartbeat before closing infrastructure", async (t) => {
  let calls = 0,
    queueClosed = 0,
    dbClosed = 0,
    heartbeatCalls = 0;
  const sweepGate = deferred(),
    heartbeatGate = deferred(),
    jobGate = deferred();
  recover = async () => {
    if (++calls > 1) await sweepGate.promise;
  };
  closeJobs = async () => {
    queueClosed++;
  };
  endDb = async () => {
    dbClosed++;
  };
  writeHeartbeat = async () => {
    heartbeatCalls++;
    await heartbeatGate.promise;
  };
  const { shutdown, timers } = start(t);
  await tick();
  assert.ok(workers.every((worker) => worker.running));
  workers[0].closeGate = jobGate.promise;
  const sweep = timers.find((timer) => timer.ms === 30000);
  const heartbeat = timers.find((timer) => timer.ms === 10000);
  sweep.run();
  sweep.run();
  heartbeat.run();
  await tick();
  heartbeat.run();
  assert.equal(calls, 2);
  assert.equal(heartbeatCalls, 1);
  const stopping = shutdown();
  await tick();
  sweep.run();
  heartbeat.run();
  assert.equal(calls, 2);
  assert.equal(heartbeatCalls, 1);
  assert.equal(queueClosed + dbClosed, 0);
  jobGate.resolve();
  sweepGate.resolve();
  await tick();
  assert.equal(
    queueClosed + dbClosed,
    0,
    "The pending heartbeat still owns Redis",
  );
  heartbeatGate.resolve();
  await stopping;
  assert.equal(queueClosed, 1);
  assert.equal(dbClosed, 1);
});

test("worker diagnostics record attempts and stalled jobs without provider secrets", async (t) => {
  recover = async () => {};
  closeJobs = endDb = async () => {};
  const logs = [];
  t.mock.method(console, "error", (line) => logs.push(JSON.parse(line)));
  t.mock.method(console, "warn", (line) => logs.push(JSON.parse(line)));
  const { shutdown } = start(t);
  await tick();
  workers[0].emit(
    "failed",
    {
      name: "index",
      id: "index-fixture",
      attemptsMade: 2,
      opts: { attempts: 3 },
      timestamp: Date.now() - 1000,
      processedOn: Date.now() - 100,
    },
    Object.assign(new Error("secret provider credential"), {
      code: "ETIMEDOUT",
    }),
  );
  workers[0].emit("stalled", "index-fixture");
  assert.equal(logs[0].attempts_made, 2);
  assert.equal(logs[0].attempts_limit, 3);
  assert.equal(logs[0].error_code, "ETIMEDOUT");
  assert.ok(logs[0].processing_ms >= 100);
  assert.equal(logs[1].event, "ai_job_stalled");
  assert.doesNotMatch(JSON.stringify(logs), /secret provider/);
  await shutdown();
});
