const { test, after } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { EventEmitter } = require("node:events");
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
const db = require("../dist/infrastructure/database/database"),
  agent = require("../dist/modules/work-assistant/work-agent"),
  { WorkStore } = require("../dist/modules/work-assistant/work-store"),
  {
    WorkAssistantService,
  } = require("../dist/modules/work-assistant/work-assistant.controller"),
  { config } = require("../dist/config/env.config");
const uuid = (n) => "82000000-0000-4000-8000-" + String(n).padStart(12, "0");
after(() => db.db.end());
function previousPack(context, budget) {
  const { busy, projectIds, ...data } = context,
    result = {
      ...data,
      tasks: [],
      freeSlots: data.freeSlots.slice(0, 20),
      focusPerTask: data.focusPerTask.slice(0, 20),
      detailPartial: data.detailPartial,
      busyIntervalCount: busy.length,
    };
  for (const task of data.tasks.slice(0, 35)) {
    result.tasks.push({
      ...task,
      description: task.description?.slice(0, 300),
      checklist: task.checklist.slice(0, 4),
      blockedBy: task.blockedBy.slice(0, 4),
    });
    if (Buffer.byteLength(JSON.stringify(result)) > budget) {
      result.tasks.pop();
      break;
    }
  }
  result.detailPartial ||=
    result.tasks.length < data.tasks.length ||
    data.focusPerTask.length > 20 ||
    data.tasks.some((t) => t.checklist.length > 4 || t.blockedBy.length > 4);
  return result;
}
test("incremental context sizing preserves exact output at UTF-8 and JSON escape byte boundaries", () => {
  const context = {
    busy: [],
    projectIds: [],
    metrics: { project: { open: 900 } },
    detailPartial: false,
    freeSlots: [],
    focusPerTask: [],
    tasks: Array.from({ length: 60 }, (_, i) => ({
      id: uuid(i + 1),
      title: '"line\\n"\n😀 € Việt Nam ' + i,
      description: i % 3 ? "Chi tiết công việc ".repeat(80) : null,
      checklist: Array.from({ length: 8 }, () => ({
        title: '"\\😀"',
        completed: false,
      })),
      blockedBy: [],
      priority: "HIGH",
    })),
  };
  const boundary = Buffer.byteLength(
    JSON.stringify(
      previousPack({ ...context, tasks: context.tasks.slice(0, 1) }, 100000),
    ),
  );
  for (const budget of [
    0,
    1,
    800,
    5000,
    20000,
    100000,
    boundary - 1,
    boundary,
    boundary + 1,
  ]) {
    assert.deepEqual(
      agent.modelContext(context, budget),
      previousPack(context, budget),
    );
    assert.equal(agent.modelContext(context, budget).metrics.project.open, 900);
  }
});
test("recent model history fetches four messages; full and paginated UI history remain unchanged", async (t) => {
  const pg = new PGlite();
  t.after(() => pg.close());
  for (const file of [
    "003_work_assistant.sql",
    "004_work_assistant_conversations.sql",
    "005_ai_performance.sql",
  ]) {
    await pg.exec("CREATE SCHEMA IF NOT EXISTS notebook_ai");
    await pg.exec(fs.readFileSync("migrations/" + file, "utf8"));
  }
  await pg.exec(fs.readFileSync("migrations/005_ai_performance.sql", "utf8"));
  let rowsFetched = 0;
  t.mock.method(db, "rows", async (sql, args = []) => {
    const result = await pg.query(sql, args);
    rowsFetched += result.rows.length;
    return result.rows;
  });
  t.mock.method(db, "transaction", (run) =>
    pg.transaction((tx) => run({ query: (sql, args) => tx.query(sql, args) })),
  );
  const store = new WorkStore(),
    actor = { id: uuid(1) },
    session = await store.session(actor),
    other = await store.session({ id: uuid(2) });
  for (let i = 0; i < 18; i++) {
    const rid = uuid(100 + i);
    await pg.query(
      "INSERT INTO notebook_ai.work_assistant_requests(id,session_id,owner_id,status) VALUES($1,$2,$3,'COMPLETED')",
      [rid, session.id, actor.id],
    );
    for (let j = 0; j < 2; j++)
      await pg.query(
        "INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content,created_at) VALUES($1,$2,$3,$4,$5,'2026-10-27T03:00:00Z')",
        [
          uuid(1000 + i * 2 + j),
          session.id,
          rid,
          j ? "assistant" : "user",
          "Fixture " + i + " " + j,
        ],
      );
  }
  const full = await store.history(session);
  assert.equal(full.messages.length, 30);
  assert.ok(full.nextCursor);
  rowsFetched = 0;
  const recent = await store.recent(session);
  assert.equal(rowsFetched, 4);
  assert.deepEqual(recent, full.messages.slice(-4));
  assert.deepEqual(await store.recent(other), []);
  const older = await store.history(session, full.nextCursor);
  assert.equal(older.messages.length, 6);
  assert.equal(
    new Set([...older.messages, ...full.messages].map((m) => m.id)).size,
    36,
  );
});
test("parallel source preparation still hides revoked history and revalidates before saving", async (t) => {
  const contextStarted = Promise.withResolvers(),
    historyStarted = Promise.withResolvers();
  const initial = {
    scope: { audience: "mine" },
    projectIds: [],
    fetchedAt: new Date().toISOString(),
    timeZone: "Asia/Ho_Chi_Minh",
    days: 7,
    sources: {},
  };
  let finished = 0;
  const service = new WorkAssistantService(
    {
      begin: async () => {},
      recent: async () => {
        historyStarted.resolve();
        await contextStarted.promise;
        return [
          {
            role: "user",
            content: "REVOKED_PRIVATE_CONTENT",
            project_ids: [uuid(99)],
            sources: [],
          },
        ];
      },
      history: async () =>
        assert.fail("Should not load the UI history page for a model prompt"),
      canceled: async () => false,
      fail: async () => {},
      finish: async () => {
        finished++;
        return { id: uuid(3) };
      },
    },
    {
      read: async () => {
        contextStarted.resolve();
        await historyStarted.promise;
        return initial;
      },
      authorize: async () => new Set(),
    },
  );
  t.mock.method(agent, "workAnswer", async (_question, history) => {
    assert.equal(history.length, 1);
    assert.equal(history[0].hidden, true);
    assert.ok(!history[0].content.includes("REVOKED_PRIVATE_CONTENT"));
    return { context: initial, content: "Safe answer", referenceTasks: [] };
  });
  const res = new EventEmitter(),
    events = [];
  res.status = res.set = () => res;
  res.flushHeaders = () => {};
  res.write = (value) => events.push(value);
  res.end = () => {};
  let timeout;
  try {
    await Promise.race([
      service.answer(
        { actor: { id: uuid(1) } },
        res,
        { id: uuid(2), project_id: null },
        "Question",
        uuid(4),
        "mine",
      ),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          res.emit("close");
          reject(Error("Independent sources did not start concurrently"));
        }, 1500);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
  assert.equal(finished, 1);
  assert.ok(events.some((s) => s.includes("event: done")));
});
test("quota SQL keeps the previous minute across UTC midnight and returns the expiry delay", async (t) => {
  const pg = new PGlite();
  t.after(() => pg.close());
  await pg.exec(fs.readFileSync("migrations/001_notebooks.sql", "utf8"));
  const llm = require("../dist/infrastructure/integrations/llm.client"),
    {
      ModelMinuteQuotaException,
    } = require("../dist/common/errors/model-quota.exception"),
    {
      TooManyRequestsException,
    } = require("../dist/common/errors/rate-limit.exception");
  const settings = {
    rpm: config.LLM_REQUESTS_PER_MINUTE,
    daily: config.LLM_REQUESTS_PER_DAY,
  };
  t.after(() => {
    config.LLM_REQUESTS_PER_MINUTE = settings.rpm;
    config.LLM_REQUESTS_PER_DAY = settings.daily;
  });
  config.LLM_REQUESTS_PER_MINUTE = 1;
  config.LLM_REQUESTS_PER_DAY = 1;
  let now = "2026-10-28 00:00:15+00";
  t.mock.method(db, "transaction", (run) =>
    pg.transaction((tx) =>
      run({
        query: (sql, args) =>
          tx.query(sql.replaceAll("now()", "timestamptz '" + now + "'"), args),
      }),
    ),
  );
  await pg.query(
    "INSERT INTO notebook_ai.model_calls(id,model,input_tokens,created_at) VALUES($1,'fixture',100,'2026-10-27 23:59:40+00')",
    [uuid(1)],
  );
  await assert.rejects(
    llm.admitModel(100, "fixture"),
    (e) => e instanceof ModelMinuteQuotaException && e.retryAfterMs === 25000,
  );
  assert.equal(
    (await pg.query("SELECT count(*) FROM notebook_ai.model_calls")).rows[0]
      .count,
    1,
  );
  await pg.query(
    "INSERT INTO notebook_ai.model_calls(id,model,input_tokens,created_at) VALUES($1,'fixture',100,'2026-10-28 00:00:05+00')",
    [uuid(2)],
  );
  now = "2026-10-28 00:02:00+00";
  await assert.rejects(
    llm.admitModel(100, "fixture"),
    (e) =>
      e instanceof TooManyRequestsException &&
      !(e instanceof ModelMinuteQuotaException),
  );
});
test("quota waiting sleeps until expiry instead of querying every two seconds", async (t) => {
  const timers = require("node:timers/promises"),
    llm = require("../dist/infrastructure/integrations/llm.client"),
    {
      admitConversationModel,
    } = require("../dist/modules/conversation-ai/model-admission"),
    {
      ModelMinuteQuotaException,
    } = require("../dist/common/errors/model-quota.exception");
  let clock = 0,
    attempts = 0;
  const waits = [];
  t.mock.method(performance, "now", () => clock);
  t.mock.method(Math, "random", () => 0);
  t.mock.method(llm, "admitModel", async () => {
    if (++attempts === 1) throw new ModelMinuteQuotaException(58000);
  });
  t.mock.method(timers, "setTimeout", async (delay, _value, { signal }) => {
    signal.throwIfAborted();
    waits.push(delay);
    clock += delay;
  });
  await admitConversationModel(1000, "fixture", new AbortController().signal);
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [58000]);
});

test("today and explicit seven-day questions use the prefetched data in one model call", async (t) => {
  const { ChatOpenAI } = require("@langchain/openai"),
    { AIMessage } = require("@langchain/core/messages"),
    llm = require("../dist/infrastructure/integrations/llm.client");
  const context = {
    scope: { audience: "mine" },
    fetchedAt: new Date().toISOString(),
    date: "2026-10-27",
    timeZone: "Asia/Ho_Chi_Minh",
    days: 7,
    projectIds: [],
    busy: [],
    tasks: [],
    focusPerTask: [],
    detailPartial: false,
    sources: {},
    metrics: {},
    freeSlots: [],
  };
  t.mock.method(llm, "admitModel", async () => {});
  let calls = 0,
    choice;
  t.mock.method(ChatOpenAI.prototype, "bindTools", (_tools, options) => ({
    invoke: async () => {
      calls++;
      assert.equal(options.tool_choice, choice);
      return new AIMessage("Fixture answer");
    },
  }));
  for (const question of [
    "Hôm nay tôi nên làm gì?",
    "Phân tích hiệu suất 7 ngày qua",
    "What should I do today?",
    "Còn tháng vừa rồi thì sao?",
  ]) {
    choice = question.startsWith("Còn") ? "auto" : "none";
    const before = calls;
    await agent.workAnswer(
      question,
      [],
      context,
      async () => assert.fail("Already has the requested fresh context"),
      new AbortController().signal,
      () => {},
    );
    assert.equal(calls - before, 1);
  }
});
test("a provider cannot request another tool after a direct-window answer was required", async (t) => {
  const { ChatOpenAI } = require("@langchain/openai"),
    { AIMessage } = require("@langchain/core/messages"),
    llm = require("../dist/infrastructure/integrations/llm.client");
  const context = {
    scope: { audience: "mine" },
    fetchedAt: new Date().toISOString(),
    date: "2026-10-27",
    timeZone: "Asia/Ho_Chi_Minh",
    days: 7,
    projectIds: [],
    busy: [],
    tasks: [],
    focusPerTask: [],
    detailPartial: false,
    sources: {},
    metrics: {},
    freeSlots: [],
  };
  t.mock.method(llm, "admitModel", async () => {});
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async () =>
      new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "get_work_context",
            id: "unexpected",
            type: "tool_call",
            args: { days: "30" },
          },
        ],
      }),
  }));
  await assert.rejects(
    agent.workAnswer(
      "Hôm nay tôi làm gì?",
      [],
      context,
      async () => assert.fail("Must not read unrequested context"),
      new AbortController().signal,
      () => {},
    ),
    /Invalid work tool response/,
  );
});
