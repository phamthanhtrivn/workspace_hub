const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");

let query, findJob, enqueueJob, meetingJob;
require.cache[require.resolve("../dist/infrastructure/database/database")] = {
  exports: { rows: (...args) => query(...args) },
};
require.cache[require.resolve("../dist/infrastructure/queue/notebook.queue")] =
  {
    exports: {
      findQueuedJob: (...args) => findJob(...args),
      enqueue: (...args) => enqueueJob(...args),
      meetingSummaryQueue: { getJob: (...args) => meetingJob(...args) },
    },
  };
const {
  recoverInterruptedJobs,
  reconcileQueuedJobs,
} = require("../dist/jobs/job-recovery");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("recovery paginates real SQL without skipping jobs as earlier rows change status", async (t) => {
  const pg = new PGlite();
  t.after(() => pg.close());
  await pg.exec(readFileSync("migrations/001_notebooks.sql", "utf8"));
  await pg.exec(readFileSync("migrations/002_meeting_summaries.sql", "utf8"));
  await pg.query(
    "INSERT INTO notebook_ai.notebooks(id,owner_id,title) VALUES($1,$1,'fixture')",
    [id(999)],
  );
  await pg.exec(`INSERT INTO notebook_ai.sources
    (id,notebook_id,document_id,version_id,revision,name,size_bytes,status,owner_email,updated_at)
    SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
    '${id(999)}',('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
    '${id(999)}','r1','fixture.txt',1,'INDEXING','fixture@example.test',now()-interval '20 minutes'
    FROM generate_series(1,205) AS n`);
  await pg.query(
    `INSERT INTO notebook_ai.artifacts(id,notebook_id,kind,cache_key,sources,status,owner_email,updated_at)
    VALUES($1,$2,'SUMMARY','fixture','[]','RUNNING','fixture@example.test',now()-interval '20 minutes')`,
    [id(500), id(999)],
  );
  await pg.query(
    `INSERT INTO notebook_ai.meeting_summaries(recording_id,run_id,actor_id,revision,status,updated_at)
    VALUES($1,$2,$2,'r1','RUNNING',now()-interval '20 minutes')`,
    [id(600), id(999)],
  );
  await pg.query(
    `INSERT INTO notebook_ai.requests(id,notebook_id,owner_id,created_at)
    VALUES($1,$2,$2,now()-interval '20 minutes')`,
    [id(700), id(999)],
  );

  const logs = [],
    scans = [],
    lookups = [];
  t.mock.method(console, "error", (line) => logs.push(JSON.parse(line)));
  t.mock.method(console, "info", (line) => logs.push(JSON.parse(line)));
  query = async (sql, args) => {
    if (sql.startsWith("SELECT *")) scans.push(args);
    if (sql.startsWith("UPDATE notebook_ai.sources") && args[0] === id(3))
      throw Object.assign(new Error("private document SQL failure"), {
        code: "40001",
      });
    return (await pg.query(sql, args)).rows;
  };
  findJob = async (kind, sourceId) => {
    lookups.push(`${kind}-${sourceId}`);
    if (sourceId === id(1)) throw new Error("private Redis connection string");
    return sourceId === id(2) ? { getState: async () => "active" } : undefined;
  };
  meetingJob = async () => undefined;
  enqueueJob = async () =>
    assert.fail("Interrupted model work must not be enqueued");
  const counts = await reconcileQueuedJobs(true);
  assert.deepEqual(counts, { checked: 208, recovered: 205, failed: 2 });
  assert.equal(new Set(lookups).size, 206);
  assert.equal(lookups.length, 206);
  assert.ok(scans.every((args) => args[2] === 100));
  assert.ok(scans.some((args) => args[1] === id(100)));
  assert.ok(scans.some((args) => args[1] === id(200)));
  const remaining = (
    await pg.query(
      "SELECT id FROM notebook_ai.sources WHERE status='INDEXING' ORDER BY id",
    )
  ).rows;
  assert.deepEqual(
    remaining.map((row) => row.id),
    [id(1), id(2), id(3)],
  );
  assert.equal(
    (await pg.query("SELECT status FROM notebook_ai.artifacts")).rows[0].status,
    "FAILED",
  );
  assert.equal(
    (await pg.query("SELECT status FROM notebook_ai.meeting_summaries")).rows[0]
      .status,
    "FAILED",
  );
  assert.equal(
    (await pg.query("SELECT status FROM notebook_ai.requests")).rows[0].status,
    "FAILED",
  );
  assert.doesNotMatch(JSON.stringify(logs), /private/);
  assert.ok(logs.some((log) => log.error_code === "40001"));
  assert.deepEqual(logs.find((log) => log.event === "ai_recovery").failed, 2);
});

test("a failed scan or enqueue does not block other recovery stages or jobs", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(console, "info", () => {});
  const enqueued = [];
  query = async (sql) => {
    if (sql.includes("meeting_summaries"))
      throw new Error("meeting DB unavailable");
    if (sql.includes("UNION ALL"))
      throw new Error("interrupted scan unavailable");
    if (sql.includes("FROM notebook_ai.sources"))
      return [
        { id: id(1), kind: "index" },
        { id: id(2), kind: "index" },
      ];
    if (sql.includes("FROM notebook_ai.artifacts"))
      return [{ id: id(3), kind: "summary" }];
    return [];
  };
  enqueueJob = async (kind, jobId) => {
    if (jobId === id(1)) throw new Error("enqueue unavailable");
    enqueued.push([kind, jobId]);
  };
  const counts = await reconcileQueuedJobs(true);
  assert.deepEqual(enqueued, [
    ["index", id(2)],
    ["summary", id(3)],
  ]);
  assert.deepEqual(counts, { checked: 3, recovered: 2, failed: 3 });
});

test("shutdown stops scanning after the in-flight recovery operation settles", async () => {
  const controller = new AbortController();
  const handled = [];
  query = async (sql, args) => {
    if (sql.includes("UNION ALL"))
      return [
        { id: id(1), kind: "index" },
        { id: id(2), kind: "index" },
      ];
    handled.push(args[0]);
    controller.abort();
    return [{ id: args[0] }];
  };
  findJob = async () => undefined;
  assert.deepEqual(await recoverInterruptedJobs(controller.signal), {
    checked: 1,
    recovered: 1,
    failed: 0,
  });
  assert.deepEqual(handled, [id(1)]);
  query = async () =>
    assert.fail("Already aborted recovery must not query SQL");
  await recoverInterruptedJobs(controller.signal);
});
