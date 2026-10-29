const { test, after } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { EventEmitter } = require("node:events"),
  { spawnSync } = require("node:child_process"),
  path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  NODE_ENV: "test",
  AI_ENABLED: "false",
  VISUAL_ENABLED: "false",
  MEETING_SUMMARY_ENABLED: "false",
  CONVERSATION_AI_ENABLED: "false",
  DATABASE_URL: "postgres://fixture:fixture@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "fixture",
});
const database = require("../dist/infrastructure/database/database"),
  { WorkStore } = require("../dist/modules/work-assistant/work-store"),
  agent = require("../dist/modules/work-assistant/work-agent"),
  {
    WorkAssistantService,
  } = require("../dist/modules/work-assistant/work-assistant.service");
const id = (n) => "83000000-0000-4000-8000-" + String(n).padStart(12, "0");
after(() => database.db.end());
async function harness(t) {
  const pg = new PGlite();
  t.after(() => pg.close());
  await pg.exec("CREATE SCHEMA notebook_ai");
  for (const f of [
    "003_work_assistant.sql",
    "004_work_assistant_conversations.sql",
    "005_ai_performance.sql",
  ])
    await pg.exec(fs.readFileSync("migrations/" + f, "utf8"));
  t.mock.method(
    database,
    "rows",
    async (sql, args = []) => (await pg.query(sql, args)).rows,
  );
  t.mock.method(database, "transaction", (run) =>
    pg.transaction((tx) => run({ query: (sql, args) => tx.query(sql, args) })),
  );
  return pg;
}
function response() {
  const res = new EventEmitter();
  res.events = [];
  res.status = res.set = () => res;
  res.flushHeaders = () => {};
  res.write = (x) => res.events.push(x);
  res.end = () => {};
  return res;
}
for (const projectId of [undefined, id(44)])
  test(
    "conversation pagination keeps its boundary for " +
      (projectId ? "project" : "personal") +
      " scope when activity changes",
    async (t) => {
      const pg = await harness(t),
        store = new WorkStore(),
        actor = { id: id(1) },
        sessions = [];
      for (let i = 0; i < 35; i++) {
        const session = await store.session(actor, projectId, true);
        sessions.push(session);
        await pg.query(
          "UPDATE notebook_ai.work_assistant_sessions SET updated_at=timestamptz '2026-10-27 03:00:00+00'+make_interval(secs=>$2) WHERE id=$1",
          [session.id, i],
        );
      }
      const first = await store.list(actor, projectId);
      assert.equal(first.sessions.length, 30);
      const last = first.sessions.at(-1);
      await pg.query(
        "UPDATE notebook_ai.work_assistant_sessions SET updated_at='2026-11-01 03:00:00+00' WHERE id=$1",
        [last.id],
      );
      const second = await store.list(actor, projectId, first.nextCursor);
      const overlap = second.sessions.filter((s) =>
        first.sessions.some((old) => old.id === s.id),
      );
      assert.equal(
        overlap.length,
        0,
        "A moving cursor must not duplicate conversations already displayed",
      );
      assert.equal(second.sessions.length, 5);
      await assert.rejects(
        store.list({ id: id(2) }, projectId, first.nextCursor),
        (e) => e.getStatus() === 404,
      );
      await assert.rejects(
        store.list(actor, projectId, "invalid-cursor"),
        (e) => e.getStatus() === 400,
      );
    },
  );
test("conversation pagination preserves PostgreSQL microseconds at its boundary", async (t) => {
  const pg = await harness(t),
    store = new WorkStore(),
    actor = { id: id(1) };
  for (let i = 0; i < 35; i++) {
    const session = await store.session(actor, undefined, true);
    await pg.query(
      "UPDATE notebook_ai.work_assistant_sessions SET updated_at=$2::timestamptz WHERE id=$1",
      [
        session.id,
        "2026-10-27T03:00:00.123" + String(i).padStart(3, "0") + "Z",
      ],
    );
  }
  const first = await store.list(actor);
  const second = await store.list(actor, undefined, first.nextCursor);
  assert.equal(first.sessions.length, 30);
  assert.equal(second.sessions.length, 5);
  assert.equal(
    new Set([...first.sessions, ...second.sessions].map((s) => s.id)).size,
    35,
  );
});

test("a seven-versus-thirty-day question supplies both exact periods to the model", async (t) => {
  const seen = [],
    windows = [],
    projects = [id(7), id(30)];
  let saved = 0,
    allowed = true;
  t.mock.method(agent, "workAnswer", async (_question, _history, initial) => {
    seen.push(initial);
    return { content: "Comparison", referenceTasks: [], context: initial };
  });
  const service = new WorkAssistantService(
    {
      begin: async () => {},
      recent: async () => [],
      canceled: async () => false,
      fail: async () => {},
      finish: async () => {
        saved++;
        return { id: id(9) };
      },
    },
    {
      read: async (_actor, scope, days) => {
        windows.push(days);
        return {
          scope,
          days,
          period: {
            from: days === 7 ? "2026-10-21" : "2026-09-28",
            to: "2026-10-28",
          },
          fetchedAt: "2026-10-27T03:00:00Z",
          timeZone: "Asia/Ho_Chi_Minh",
          projectIds: [id(days)],
          sources: {
            project: { state: "ready" },
            calendar: { state: "empty" },
          },
          metrics: {
            project: { completedInPeriod: days === 7 ? 5 : 17 },
            personal: null,
            focusSeconds: 0,
            focusSessions: 0,
          },
          tasks: [],
          freeSlots: [],
          focusPerTask: [],
          busy: [],
        };
      },
      authorize: async () => new Set(allowed ? projects : [id(30)]),
    },
  );
  const res = response();
  await service.answer(
    { id: id(1) },
    res,
    { id: id(3), project_id: null },
    {
      question: "So sánh hiệu suất 7 ngày và 30 ngày qua",
      requestId: id(4),
      audience: "mine",
    },
  );
  assert.deepEqual(
    windows.sort((a, b) => a - b),
    [7, 30],
  );
  assert.deepEqual(
    seen[0].comparison.map((p) => [
      p.days,
      p.metrics.project.completedInPeriod,
    ]),
    [
      [7, 5],
      [30, 17],
    ],
  );
  assert.deepEqual(new Set(seen[0].projectIds), new Set(projects));
  assert.equal(saved, 1);
  allowed = false;
  const revoked = response();
  await service.answer(
    { id: id(1) },
    revoked,
    { id: id(3), project_id: null },
    {
      question: "So sánh 7 ngày với 30 ngày qua",
      requestId: id(5),
      audience: "mine",
    },
  );
  assert.equal(
    saved,
    1,
    "A revoked project from either period must prevent persistence",
  );
  assert.ok(revoked.events.some((s) => s.includes('"status":403')));
});
test("local speech rejects enabled multi-chunk concurrency instead of failing jobs with HTTP 429", () => {
  const env = {
    ...process.env,
    MEETING_SUMMARY_ENABLED: "true",
    MEETING_STT_CONCURRENCY: "2",
    MEETING_STT_SERVICE_KEY: "fixture-speech-key-at-least-32-characters",
    AI_COMMUNICATION_SERVICE_KEY:
      "fixture-communication-key-at-least-32-characters",
    MEETING_MEDIA_HOSTS: "fixture.example",
  };
  const file = path.resolve("dist/config/env.config.js");
  const result = spawnSync(
    process.execPath,
    ["-e", "require(process.argv[1])", file],
    { env, encoding: "utf8", windowsHide: true },
  );
  assert.notEqual(
    result.status,
    0,
    "The local worker supports one request, not two concurrent chunks",
  );
  assert.match(result.stderr, /MEETING_STT_CONCURRENCY/);
  const disabled = spawnSync(
    process.execPath,
    ["-e", "require(process.argv[1])", file],
    {
      env: { ...env, MEETING_SUMMARY_ENABLED: "false" },
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(
    disabled.status,
    0,
    "Disabled meeting summaries must not prevent unrelated AI features from starting",
  );
});

test("comparison windows cover abbreviated Vietnamese/English forms without treating task counts as periods", () => {
  for (const [question, expected] of [
    ["So sánh 7 ngày và 30 ngày qua", [7, 30]],
    ["So sánh 7 và 30 ngày qua", [7, 30]],
    ["Compare 7 and 30 days", [7, 30]],
    ["So sánh bảy ngày với ba mươi ngày qua", [7, 30]],
    ["Hôm nay tôi có 30 task", [7]],
    ["last thirty days", [30]],
    ["ba mươi ngày qua", [30]],
    ["Hôm nay tôi làm gì?", [7]],
  ])
    assert.deepEqual(agent.requestedWorkWindows(question), expected, question);
});
test("opaque conversation cursors reject malformed timestamps, foreign fields and invalid encodings", () => {
  const {
    conversationCursor,
    parseConversationCursor,
  } = require("../dist/modules/work-assistant/work-cursor");
  const date = "2026-10-27T03:00:00.000Z",
    cursor = conversationCursor(id(1), new Date(date));
  assert.deepEqual(parseConversationCursor(cursor), {
    id: id(1),
    updatedAt: date,
  });
  assert.deepEqual(parseConversationCursor(id(1)), { id: id(1) });
  for (const value of [
    "invalid-cursor",
    "x".repeat(513),
    "%",
    ...[
      { id: id(1), updatedAt: "not-a-date" },
      { id: "invalid", updatedAt: date },
      { id: id(1), updatedAt: date, ownerId: id(2) },
    ].map((v) => Buffer.from(JSON.stringify(v)).toString("base64url")),
  ])
    assert.throws(
      () => parseConversationCursor(value),
      (e) => e.getStatus() === 400,
    );
});
test("comparison data preserves unavailable sources and exact metrics instead of treating missing data as zero", () => {
  const comparison = [
    {
      days: 7,
      period: { from: "2026-10-21", to: "2026-10-28" },
      fetchedAt: "2026-10-27T03:00:00Z",
      sources: {
        project: { state: "unavailable" },
        calendar: { state: "empty" },
      },
      metrics: {
        project: null,
        personal: { completedInPeriod: 0 },
        focusSeconds: 0,
        focusSessions: 0,
      },
    },
    {
      days: 30,
      period: { from: "2026-09-28", to: "2026-10-28" },
      fetchedAt: "2026-10-27T03:00:00Z",
      sources: { project: { state: "ready" }, calendar: { state: "empty" } },
      metrics: {
        project: { completedInPeriod: 17, onTimeRate: 4 / 6 },
        personal: null,
        focusSeconds: 0,
        focusSessions: 0,
      },
    },
  ];
  const packed = agent.modelContext({
    comparison,
    projectIds: [],
    tasks: [],
    busy: [],
    freeSlots: [],
    focusPerTask: [],
    detailPartial: false,
  });
  assert.deepEqual(packed.comparison, comparison);
  assert.equal(packed.comparison[0].metrics.project, null);
  assert.equal(packed.comparison[1].metrics.project.onTimeRate, 4 / 6);
});
