const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { PGlite } = require("@electric-sql/pglite");
const key = "fixture-meeting-service-key-not-production-000";
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  AI_ENABLED: "true",
  MEETING_SUMMARY_ENABLED: "true",
  VISUAL_ENABLED: "false",
  CONVERSATION_AI_ENABLED: "false",
  MEETING_STT_SERVICE_KEY: "fixture-local-speech-service-key-00000",
  MEETING_MEDIA_HOSTS: "media.example",
  AI_COMMUNICATION_SERVICE_KEY: key,
  AI_GATEWAY_KEY: key,
  AI_DOCUMENT_SERVICE_KEY: key,
  RAG_SERVICE_KEY: key,
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://vibi.top/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "fixture",
});
class FakeQueue extends EventEmitter {
  client = Promise.resolve({ get: async () => "ready:meeting-v1" });
  added = [];
  async add(name, data, options) {
    this.added.push({ name, data, options });
  }
  async close() {}
}
const bull = require("bullmq");
require.cache[require.resolve("bullmq")].exports = {
  ...bull,
  Queue: FakeQueue,
};
const database = require("../dist/infrastructure/database/database");
const source = require("../dist/modules/meeting-summary/source");
const {
  meetingSummaryQueue,
} = require("../dist/infrastructure/queue/notebook.queue");
const {
  MeetingSummaryController,
} = require("../dist/modules/meeting-summary/meeting-summary.controller");
const controller = new MeetingSummaryController();
const id = "11111111-1111-4111-8111-111111111111";
const actor = "22222222-2222-4222-8222-222222222222";
let sql;
before(async () => {
  sql = new PGlite();
  await sql.exec("CREATE SCHEMA notebook_ai");
  await sql.exec(
    await fs.readFile(
      path.join(__dirname, "../migrations/002_meeting_summaries.sql"),
      "utf8",
    ),
  );
});
beforeEach(async (t) => {
  await sql.exec("TRUNCATE notebook_ai.meeting_summaries");
  meetingSummaryQueue.added = [];
  t.mock.method(
    database,
    "rows",
    async (query, args) => (await sql.query(query, args)).rows,
  );
  t.mock.method(source, "meetingSource", async () => ({
    revision: "a".repeat(64),
  }));
});
after(async () => {
  await sql.close();
  await database.db.end();
});

test("repeated creation queues once; completed summaries are reused", async () => {
  assert.equal((await controller.start(id, key, actor)).status, "QUEUED");
  await controller.start(id, key, actor);
  assert.equal(meetingSummaryQueue.added.length, 1);
  assert.equal(meetingSummaryQueue.added[0].options.attempts, 1);
  assert.deepEqual(Object.keys(meetingSummaryQueue.added[0].data).sort(), [
    "recordingId",
    "runId",
  ]);
  await sql.exec(
    "UPDATE notebook_ai.meeting_summaries SET status='COMPLETED',content='saved summary'",
  );
  assert.equal(
    (await controller.start(id, key, actor)).content,
    "saved summary",
  );
  assert.equal(meetingSummaryQueue.added.length, 1);
});

test("explicit retries preserve same-revision checkpoints and create a new run", async () => {
  await controller.start(id, key, actor);
  const first = meetingSummaryQueue.added[0].data.runId;
  await sql.exec(
    `UPDATE notebook_ai.meeting_summaries SET status='FAILED',transcript_complete=true,transcript='[{"startSeconds":0,"text":"saved"}]'`,
  );
  assert.equal((await controller.start(id, key, actor)).transcribedChunks, 1);
  assert.notEqual(meetingSummaryQueue.added[1].data.runId, first);
  assert.equal(
    (
      await sql.query(
        "SELECT transcript_complete FROM notebook_ai.meeting_summaries",
      )
    ).rows[0].transcript_complete,
    true,
  );
});

test("a new recording revision clears completed transcript and note checkpoints", async () => {
  await controller.start(id, key, actor);
  await sql.exec(`UPDATE notebook_ai.meeting_summaries SET status='FAILED',transcript_complete=true,
    transcript='[{"startSeconds":0,"text":"old"}]',partials='[{"hash":"old","text":"old"}]'`);
  source.meetingSource.mock.mockImplementation(async () => ({
    revision: "b".repeat(64),
  }));
  await controller.start(id, key, actor);
  const saved = (await sql.query("SELECT * FROM notebook_ai.meeting_summaries"))
    .rows[0];
  assert.equal(saved.transcript_complete, false);
  assert.deepEqual(saved.transcript, []);
  assert.deepEqual(saved.partials, []);
});

test("queue failures leave an explicit retryable failure rather than a stuck queued result", async (t) => {
  t.mock.method(meetingSummaryQueue, "add", async () => {
    throw Error("Redis offline");
  });
  await assert.rejects(controller.start(id, key, actor), /queue unavailable/);
  assert.equal((await controller.status(id, key)).status, "FAILED");
});

test("invalid internal credentials and missing worker heartbeat reject before creating a request", async (t) => {
  await assert.rejects(controller.start(id, "invalid", actor));
  const redis = await meetingSummaryQueue.client;
  t.mock.method(redis, "get", async () => null);
  await assert.rejects(
    controller.start(id, key, actor),
    /worker is unavailable/,
  );
  assert.equal(meetingSummaryQueue.added.length, 0);
  assert.equal(
    (await sql.query("SELECT * FROM notebook_ai.meeting_summaries")).rows
      .length,
    0,
  );
});
