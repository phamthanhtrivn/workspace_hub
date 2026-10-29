const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  AI_ENABLED: "true",
  NODE_ENV: "test",
  AI_GATEWAY_KEY: "fixture-gateway-proof-at-least-32-characters",
  AI_DOCUMENT_SERVICE_KEY: "fixture-document-proof-at-least-32-characters",
  RAG_SERVICE_KEY: "fixture-rag-service-at-least-32-characters",
  WORK_ASSISTANT_SERVICE_KEY:
    "fixture-assistant-service-at-least-32-characters",
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "fixture",
  VISUAL_ENABLED: "false",
});
const db = require("../dist/infrastructure/database/database");
const {
  dateKey,
  addDays,
  workRange,
  freeSlots,
  wallTime,
} = require("../dist/modules/work-assistant/work-time");
const {
  WorkContextService,
} = require("../dist/modules/work-assistant/work-context");
const agent = require("../dist/modules/work-assistant/work-agent");
const {
  WorkAssistantModule,
} = require("../dist/modules/work-assistant/work-assistant.module");
after(() => db.db.end());
const id = () => randomUUID();
const zone = "Asia/Ho_Chi_Minh";
test("Calendar gaps exclude busy/all-day/past intervals without inventing working hours; DST and weekends are supported", () => {
  const now = new Date("2026-10-27T03:00:00Z");
  assert.equal(
    workRange(new Date("2026-10-26T18:00:00Z"), zone, 7).today,
    "2026-10-27",
  );
  assert.equal(
    wallTime("2026-03-08", 540, "America/New_York").toISOString(),
    "2026-03-08T13:00:00.000Z",
  );
  const busy = [
    { startAt: "2026-10-27T03:30:00Z", endAt: "2026-10-27T04:30:00Z" },
    { startAt: "2026-10-27T04:00:00Z", endAt: "2026-10-27T05:00:00Z" },
    { startAt: "2026-10-27T17:00:00Z", endAt: "2026-10-28T17:00:00Z" },
  ];
  const slots = freeSlots(now, zone, busy, false);
  assert.deepEqual(
    slots.filter((s) => dateKey(new Date(s.startAt), zone) === "2026-10-27"),
    [
      {
        startAt: "2026-10-27T03:00:00.000Z",
        endAt: "2026-10-27T03:30:00.000Z",
      },
      {
        startAt: "2026-10-27T05:00:00.000Z",
        endAt: "2026-10-27T17:00:00.000Z",
      },
    ],
  );
  assert.ok(
    !slots.some((s) => dateKey(new Date(s.startAt), zone) === "2026-10-28"),
  );
  assert.ok(
    slots.some((s) => dateKey(new Date(s.startAt), zone) === "2026-10-31"),
  );
  assert.ok(slots.every((s) => Date.parse(s.startAt) >= now.getTime()));
  assert.ok(
    slots.every((s) =>
      busy.every(
        (b) =>
          Date.parse(s.endAt) <= Date.parse(b.startAt) ||
          Date.parse(s.startAt) >= Date.parse(b.endAt),
      ),
    ),
  );
  assert.deepEqual(freeSlots(now, zone, [], true), []);
  assert.deepEqual(
    freeSlots(now, zone, [{ startAt: "wrong", endAt: "wrong" }], false),
    [],
  );
  const crossDay = freeSlots(
    now,
    zone,
    [{ startAt: "2026-10-27T16:00:00Z", endAt: "2026-10-27T18:00:00Z" }],
    false,
  );
  assert.equal(
    crossDay.find((s) => dateKey(new Date(s.startAt), zone) === "2026-10-28")
      .startAt,
    "2026-10-27T18:00:00.000Z",
  );
});
test("source outages are distinct from empty data; only the authenticated actor is sent to internal services", async (t) => {
  const actor = { id: id(), email: "owner@example.test" };
  let calendarBusy = [],
    calendarIncomplete = false,
    calendarOffline = false;
  t.mock.method(global, "fetch", async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.userId, actor.id);
    assert.equal(
      options.headers["x-internal-service-key"],
      process.env.WORK_ASSISTANT_SERVICE_KEY,
    );
    if (url.includes("8082") || calendarOffline)
      return new Response(null, { status: 503 });
    return Response.json({
      data: {
        available: true,
        timeZone: zone,
        partial: false,
        busyPartial: calendarIncomplete,
        busy: calendarBusy,
        tasks: [],
        focusPerTask: [],
        metrics: {
          open: 0,
          overdue: 0,
          dueToday: 0,
          completedInPeriod: 0,
          completedWithDeadline: 0,
          onTime: 0,
          late: 0,
          onTimeRate: null,
          deadlineBasis: "current stored deadline",
        },
        focus: { seconds: 0, sessions: 0, perTask: [] },
      },
    });
  });
  const context = await new WorkContextService().read(
    actor,
    { audience: "mine" },
    7,
  );
  assert.equal(context.sources.project.state, "unavailable");
  assert.equal(context.sources.calendar.state, "empty");
  assert.equal(context.metrics.project, null);
  assert.equal(context.metrics.personal.open, 0);
  assert.equal(context.schedulingBasis, "calendar");
  assert.ok(context.freeSlots.length > 0);
  assert.equal("preferences" in context, false);
  const startAt = wallTime(
    addDays(dateKey(new Date(), zone), 1),
    600,
    zone,
  ).toISOString();
  const endAt = new Date(Date.parse(startAt) + 3600000).toISOString();
  calendarBusy = [{ startAt, endAt }];
  const updated = await new WorkContextService().read(actor, {
    audience: "mine",
  });
  assert.ok(
    updated.freeSlots.every(
      (s) =>
        Date.parse(s.endAt) <= Date.parse(startAt) ||
        Date.parse(s.startAt) >= Date.parse(endAt),
    ),
  );
  calendarIncomplete = true;
  const incomplete = await new WorkContextService().read(actor, {
    audience: "mine",
  });
  assert.equal(incomplete.busyPartial, true);
  assert.deepEqual(incomplete.freeSlots, []);
  calendarIncomplete = false;
  calendarBusy = [{ startAt: "invalid", endAt }];
  const malformed = await new WorkContextService().read(actor, {
    audience: "mine",
  });
  assert.equal(malformed.sources.calendar.state, "unavailable");
  assert.deepEqual(malformed.freeSlots, []);
  calendarOffline = true;
  const unavailable = await new WorkContextService().read(actor, {
    audience: "mine",
  });
  assert.equal(unavailable.sources.calendar.state, "unavailable");
  assert.deepEqual(unavailable.freeSlots, []);
});
test("model task tool cannot choose identities or projects; context is fresh and bounded", async (t) => {
  const { ChatOpenAI } = require("@langchain/openai");
  const { AIMessage } = require("@langchain/core/messages");
  const llm = require("../dist/infrastructure/integrations/llm.client");
  t.mock.method(llm, "admitModel", async () => {});
  const context = {
    scope: { audience: "mine" },
    fetchedAt: new Date().toISOString(),
    date: "2026-10-27",
    timeZone: zone,
    days: 7,
    projectIds: [],
    busy: [],
    tasks: [],
    focusPerTask: [],
    detailPartial: false,
    sources: { project: { state: "empty" }, calendar: { state: "empty" } },
    metrics: {},
    schedulingBasis: "calendar",
    freeSlots: [],
  };
  let calls = 0;
  t.mock.method(ChatOpenAI.prototype, "bindTools", (tools) => ({
    invoke: async (messages) => {
      assert.match(messages[0].content, /Không thể tạo/);
      assert.ok(
        messages.some(
          (m) => m.getType() === "tool" && m.content.includes("fetchedAt"),
        ),
      );
      assert.equal(tools[0].name, "get_work_context");
      return new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "get_work_context",
            id: "bad",
            args: { days: "7", userId: id() },
            type: "tool_call",
          },
        ],
      });
    },
  }));
  await assert.rejects(
    agent.workAnswer(
      "My tasks",
      [],
      context,
      async () => {
        calls++;
        return context;
      },
      new AbortController().signal,
      () => {},
    ),
  );
  assert.equal(calls, 0);
});
test(
  "private HTTP sessions enforce ownership, replay protection, Calendar scheduling, permission revocation and cancellation",
  { timeout: 20000 },
  async (t) => {
    const pg = new PGlite();
    await pg.exec("CREATE SCHEMA notebook_ai;");
    const migration = readFileSync("migrations/003_work_assistant.sql", "utf8");
    await pg.exec(migration);
    await pg.exec(migration);
    const conversationsMigration = readFileSync(
      "migrations/004_work_assistant_conversations.sql",
      "utf8",
    );
    await pg.exec(conversationsMigration);
    await pg.exec(conversationsMigration);
    t.mock.method(
      db,
      "rows",
      async (sql, args = []) => (await pg.query(sql, args)).rows,
    );
    t.mock.method(db, "transaction", async (run) => {
      await pg.exec("BEGIN");
      try {
        const result = await run({
          query: (sql, args = []) => pg.query(sql, args),
        });
        await pg.exec("COMMIT");
        return result;
      } catch (error) {
        await pg.exec("ROLLBACK");
        throw error;
      }
    });
    const projectId = id(),
      owner = id(),
      other = id();
    let allowed = new Set([projectId]),
      modelCalls = 0,
      wait = false;
    const modelHistories = [];
    const contextService = new WorkContextService();
    t.mock.method(
      contextService,
      "authorize",
      async (_actor, ids) => new Set(ids.filter((p) => allowed.has(p))),
    );
    t.mock.method(contextService, "requireScope", async (_actor, scope) => {
      if (scope.projectId && !allowed.has(scope.projectId))
        throw new (require("@nestjs/common").ForbiddenException)();
    });
    t.mock.method(contextService, "read", async (_actor, scope) => ({
      scope,
      projectIds: [projectId],
      busy: [],
      freeSlots: [],
      timeZone: zone,
      days: 7,
      tasks: [],
      focusPerTask: [],
      fetchedAt: new Date().toISOString(),
      sources: { project: { state: "empty" }, calendar: { state: "empty" } },
    }));
    t.mock.method(
      agent,
      "workAnswer",
      async (_question, _history, initial, _read, signal) => {
        modelCalls++;
        modelHistories.push(_history.length);
        signal.throwIfAborted();
        if (wait)
          await new Promise((resolve, reject) =>
            signal.addEventListener("abort", () => reject(Error("canceled")), {
              once: true,
            }),
          );
        return { content: "Read-only answer", context: initial };
      },
    );
    const { NestFactory } = require("@nestjs/core");
    const app = await NestFactory.create(WorkAssistantModule, {
      logger: false,
    });
    app.use(require("express").json());
    app.get(WorkContextService).authorize = contextService.authorize;
    app.get(WorkContextService).requireScope = contextService.requireScope;
    app.get(WorkContextService).read = contextService.read;
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const request = (path, actor = owner, method = "GET", body) =>
      fetch(base + "/api/ai/work-assistant" + path, {
        method,
        headers: {
          "content-type": "application/json",
          "x-user-id": actor,
          "x-user-email": "owner@example.test",
          "x-workspace-gateway-key": process.env.AI_GATEWAY_KEY,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    try {
      const denied = await fetch(base + "/api/ai/work-assistant/session", {
        headers: { "x-user-id": owner, "x-user-email": "owner@example.test" },
      });
      assert.equal(denied.status, 401);
      const initialResponse = await request("/session");
      assert.equal(initialResponse.status, 200);
      const first = (await initialResponse.json()).data;
      const second = (await (await request("/session", other)).json()).data;
      assert.notEqual(first.id, second.id);
      assert.equal(
        (
          await request("/sessions/" + first.id + "/messages", other, "POST", {
            question: "Hi",
            requestId: id(),
          })
        ).status,
        404,
      );
      assert.equal((await request("/preferences")).status, 404);
      assert.equal(
        (await request("/preferences", owner, "PUT", {})).status,
        404,
      );
      const requestId = id();
      const answer = await request(
        "/sessions/" + first.id + "/messages",
        owner,
        "POST",
        { question: "Today?", requestId },
      );
      assert.match(answer.headers.get("content-type"), /text\/event-stream/);
      assert.match(await answer.text(), /event: done/);
      assert.equal(modelCalls, 1);
      assert.equal(
        (
          await request("/sessions/" + first.id + "/messages", owner, "POST", {
            question: "Today?",
            requestId,
          })
        ).status,
        409,
      );
      let history = (await (await request("/session")).json()).data;
      assert.equal(history.messages.length, 2);
      const created = (
        await (await request("/sessions", owner, "POST", {})).json()
      ).data;
      assert.notEqual(created.id, first.id);
      assert.equal(created.messages.length, 0);
      assert.equal(
        (await (await request("/session")).json()).data.id,
        created.id,
      );
      assert.equal(
        (await (await request("/session?sessionId=" + first.id)).json()).data
          .messages.length,
        2,
      );
      assert.equal(
        (await request("/session?sessionId=" + first.id, other)).status,
        404,
      );
      assert.equal(
        (
          await request(
            "/session?sessionId=" + first.id + "&projectId=" + projectId,
          )
        ).status,
        400,
      );
      const newAnswer = await request(
        "/sessions/" + created.id + "/messages",
        owner,
        "POST",
        {
          question: "Independent question",
          requestId: id(),
        },
      );
      assert.match(await newAnswer.text(), /event: done/);
      assert.deepEqual(modelHistories, [0, 0]);
      const titles = (await (await request("/sessions")).json()).data.sessions;
      assert.equal(titles.length, 2);
      assert.equal(titles.find((s) => s.id === first.id).title, "Today?");
      assert.equal(
        titles.find((s) => s.id === created.id).title,
        "Independent question",
      );
      const otherList = (await (await request("/sessions", other)).json()).data
        .sessions;
      assert.ok(
        otherList.every((s) => s.id !== first.id && s.id !== created.id),
      );
      assert.equal(
        (await request("/sessions?before=" + first.id, other)).status,
        404,
      );
      allowed.clear();
      const hiddenList = (await (await request("/sessions")).json()).data
        .sessions;
      assert.ok(
        hiddenList.every((s) => s.title === "Cuộc trò chuyện trước đây"),
      );
      assert.equal(
        (await request("/sessions?projectId=" + projectId)).status,
        403,
      );
      assert.equal(
        (await request("/sessions", owner, "POST", { projectId })).status,
        403,
      );
      history = (await (await request("/session")).json()).data;
      assert.ok(
        history.messages.every(
          (m) =>
            m.hidden &&
            m.sources.length === 0 &&
            !m.content.includes("Read-only answer"),
        ),
      );
      assert.equal(
        (await request("/session?projectId=" + projectId)).status,
        403,
      );
      allowed.add(projectId);
      wait = true;
      const cancelId = id();
      const stream = await request(
        "/sessions/" + first.id + "/messages",
        owner,
        "POST",
        { question: "Wait", requestId: cancelId },
      );
      assert.equal(
        (await request("/requests/" + cancelId + "/cancel", other, "POST", {}))
          .status,
        404,
      );
      assert.equal(
        (await request("/requests/" + cancelId + "/cancel", owner, "POST", {}))
          .status,
        201,
      );
      assert.match(await stream.text(), /event: error/);
      assert.equal(
        (await request("/sessions/" + first.id + "/messages", owner, "DELETE"))
          .status,
        404,
      );
      assert.equal(
        (await (await request("/session?sessionId=" + first.id)).json()).data
          .messages.length,
        2,
      );
      // Starting new conversations keeps old messages and replay protection.
      assert.equal(
        (
          await request("/sessions/" + first.id + "/messages", owner, "POST", {
            question: "Replay",
            requestId,
          })
        ).status,
        409,
      );
      for (let i = 0; i < 32; i++)
        assert.equal(
          (await request("/sessions", owner, "POST", {})).status,
          201,
        );
      const page1 = (await (await request("/sessions")).json()).data;
      assert.equal(page1.sessions.length, 30);
      assert.ok(page1.nextCursor);
      const page2 = (
        await (await request("/sessions?before=" + page1.nextCursor)).json()
      ).data;
      assert.equal(page2.sessions.length, 4);
      assert.equal(
        new Set([...page1.sessions, ...page2.sessions].map((s) => s.id)).size,
        34,
      );
      const scoped = (
        await (await request("/sessions", owner, "POST", { projectId })).json()
      ).data;
      assert.equal(
        (await (await request("/sessions?projectId=" + projectId)).json()).data
          .sessions.length,
        1,
      );
      assert.equal(
        (await request("/session?sessionId=" + scoped.id)).status,
        400,
      );
    } finally {
      await app.close();
      await pg.close();
    }
  },
);

test("30-day requests replace the previous snapshot and use fresh backend metrics", async (t) => {
  const { ChatOpenAI } = require("@langchain/openai");
  const { AIMessage } = require("@langchain/core/messages");
  const llm = require("../dist/infrastructure/integrations/llm.client");
  t.mock.method(llm, "admitModel", async () => {});
  const initial = {
    scope: { audience: "mine" },
    fetchedAt: new Date().toISOString(),
    date: "2026-10-27",
    timeZone: zone,
    days: 7,
    projectIds: [],
    busy: [],
    tasks: [],
    focusPerTask: [],
    detailPartial: false,
    sources: { project: { state: "ready" }, calendar: { state: "ready" } },
    metrics: { project: { completedInPeriod: 4 } },
    schedulingBasis: "calendar",
    freeSlots: [],
  };
  const fresh = {
    ...initial,
    days: 30,
    metrics: { project: { completedInPeriod: 17 } },
  };
  let turns = 0,
    reads = 0;
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async (messages) => {
      if (turns++ === 0)
        return new AIMessage({
          content: "",
          tool_calls: [
            {
              name: "get_work_context",
              id: "month",
              args: { days: "30" },
              type: "tool_call",
            },
          ],
        });
      const results = messages
        .filter((m) => m.getType() === "tool")
        .map((m) => m.content);
      assert.match(results[0], /replaced/);
      assert.equal(
        JSON.parse(results.at(-1)).metrics.project.completedInPeriod,
        17,
      );
      return new AIMessage("17 completed tasks in the last 30 days.");
    },
  }));
  const answer = await agent.workAnswer(
    "Show 30 days",
    [],
    initial,
    async (days) => {
      reads++;
      assert.equal(days, 30);
      return fresh;
    },
    new AbortController().signal,
    () => {},
  );
  assert.equal(reads, 1);
  assert.equal(turns, 2);
  assert.equal(answer.context.days, 30);
});

test("large task details are bounded without changing exact metrics", () => {
  const task = {
    id: id(),
    kind: "project",
    projectId: id(),
    project: "Project",
    title: "Long task",
    description: "x".repeat(800),
    priority: "HIGH",
    status: "TODO",
    dueAt: null,
    allDay: false,
    overdue: false,
    dueToday: false,
    url: "/projects/demo",
    checklist: Array.from({ length: 8 }, () => ({
      title: "c".repeat(160),
      completed: false,
    })),
    checklistCount: 8,
    childCount: 0,
    unblocks: 0,
    blockedBy: Array.from({ length: 8 }, () => ({
      id: id(),
      title: "b".repeat(160),
    })),
  };
  const context = {
    busy: [],
    projectIds: [],
    tasks: Array.from({ length: 60 }, () => task),
    freeSlots: [],
    focusPerTask: [],
    detailPartial: false,
    metrics: { project: { open: 900 } },
  };
  const compact = agent.modelContext(context);
  assert.ok(Buffer.byteLength(JSON.stringify(compact)) < 20500);
  assert.equal(compact.detailPartial, true);
  assert.equal(compact.metrics.project.open, 900);
  assert.ok(compact.tasks.length < context.tasks.length);
});

test("explicit 30-day windows prefetch directly and cannot spend another tool turn", async (t) => {
  assert.equal(agent.requestedWorkDays("Phan tich 30 ngay qua"), 30);
  assert.equal(agent.requestedWorkDays("last 30 days"), 30);
  assert.equal(agent.requestedWorkDays("I have 30 tasks"), 7);
  const { ChatOpenAI } = require("@langchain/openai");
  const { AIMessage } = require("@langchain/core/messages");
  const llm = require("../dist/infrastructure/integrations/llm.client");
  t.mock.method(llm, "admitModel", async () => {});
  let calls = 0;
  t.mock.method(ChatOpenAI.prototype, "bindTools", (_tools, options) => ({
    invoke: async () => {
      calls++;
      assert.equal(options.tool_choice, "none");
      return new AIMessage("30-day result");
    },
  }));
  const context = {
    scope: { audience: "mine" },
    fetchedAt: new Date().toISOString(),
    date: "2026-10-27",
    timeZone: zone,
    days: 30,
    projectIds: [],
    busy: [],
    tasks: [],
    focusPerTask: [],
    detailPartial: false,
    sources: {},
    metrics: {},
    schedulingBasis: "calendar",
    freeSlots: [],
  };
  await agent.workAnswer(
    "last 30 days",
    [],
    context,
    async () => assert.fail("already fetched"),
    new AbortController().signal,
    () => {},
  );
  assert.equal(calls, 1);
});
test("assistant minute quota returns 429 before any provider call", async (t) => {
  const { ChatOpenAI } = require("@langchain/openai"),
    llm = require("../dist/infrastructure/integrations/llm.client");
  const {
    ModelMinuteQuotaException,
  } = require("../dist/common/errors/model-quota.exception");
  t.mock.method(llm, "admitModel", async () => {
    throw new ModelMinuteQuotaException();
  });
  t.mock.method(ChatOpenAI.prototype, "bindTools", () =>
    assert.fail("must not call provider"),
  );
  const context = {
    scope: { audience: "mine" },
    fetchedAt: new Date().toISOString(),
    date: "2026-10-27",
    timeZone: zone,
    days: 7,
    projectIds: [],
    busy: [],
    tasks: [],
    focusPerTask: [],
    detailPartial: false,
    sources: {},
    metrics: {},
    schedulingBasis: "calendar",
    freeSlots: [],
  };
  await assert.rejects(
    agent.workAnswer(
      "Today?",
      [],
      context,
      async () => context,
      new AbortController().signal,
      () => {},
    ),
    (error) => error.getStatus() === 429,
  );
});

test("actual configured token budget includes system prompt and history before packing tasks", async (t) => {
  const { ChatOpenAI } = require("@langchain/openai"),
    { AIMessage } = require("@langchain/core/messages");
  const llm = require("../dist/infrastructure/integrations/llm.client"),
    { config } = require("../dist/config/env.config");
  const previous = config.LLM_TOKENS_PER_MINUTE;
  config.LLM_TOKENS_PER_MINUTE = 10000;
  t.after(() => {
    config.LLM_TOKENS_PER_MINUTE = previous;
  });
  t.mock.method(llm, "admitModel", async (tokens) =>
    assert.ok(tokens <= 10000),
  );
  let received;
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({
    invoke: async (messages) => {
      received = JSON.parse(
        messages.filter((m) => m.getType() === "tool").at(-1).content,
      );
      return new AIMessage("Budgeted result");
    },
  }));
  const task = {
    id: id(),
    kind: "project",
    projectId: id(),
    title: "Task",
    description: "x".repeat(800),
    priority: "HIGH",
    status: "TODO",
    dueAt: null,
    allDay: false,
    overdue: false,
    dueToday: false,
    url: "/projects/test",
    checklist: [],
    checklistCount: 0,
    childCount: 0,
    unblocks: 0,
    blockedBy: [],
  };
  const context = {
    scope: { audience: "mine" },
    fetchedAt: new Date().toISOString(),
    date: "2026-10-27",
    timeZone: zone,
    days: 7,
    projectIds: [],
    busy: [],
    tasks: Array.from({ length: 60 }, () => task),
    focusPerTask: [],
    detailPartial: false,
    sources: {},
    metrics: { project: { open: 75 } },
    schedulingBasis: "calendar",
    freeSlots: [],
  };
  const history = Array.from({ length: 4 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: "Long previous answer ".repeat(200),
  }));
  const result = await agent.workAnswer(
    "What next?",
    history,
    context,
    async () => context,
    new AbortController().signal,
    () => {},
  );
  assert.equal(received.metrics.project.open, 75);
  assert.equal(received.detailPartial, true);
  assert.equal(result.referenceTasks.length, received.tasks.length);
});
