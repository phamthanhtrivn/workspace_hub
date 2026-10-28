const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  crypto = require("crypto"),
  { EventEmitter } = require("events");
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
const { PGlite } = require("@electric-sql/pglite"),
  db = require("../dist/infrastructure/database/database"),
  agent = require("../dist/modules/work-assistant/work-agent"),
  { WorkStore } = require("../dist/modules/work-assistant/work-store"),
  {
    WorkAssistantService,
  } = require("../dist/modules/work-assistant/work-assistant.controller"),
  { visualEvidence } = require("../dist/modules/chat/visual-evidence"),
  { config } = require("../dist/config/env.config");
const phase = process.argv[2];
assert.ok(["before", "after"].includes(phase));
const out = path.resolve(__dirname, "../../../docs/testing/ai-performance"),
  uuid = (n) => "81000000-0000-4000-8000-" + String(n).padStart(12, "0"),
  hash = (x) =>
    crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex"),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function measure(run, n = 15) {
  let a = [];
  for (let i = 0; i < 3; i++) await run();
  for (let i = 0; i < n; i++) {
    let t = performance.now();
    await run();
    a.push(performance.now() - t);
  }
  a.sort((a, b) => a - b);
  return {
    medianMs: +a[Math.floor(a.length / 2)].toFixed(4),
    p95Ms: +a[Math.floor(a.length * 0.95)].toFixed(4),
    samples: n,
  };
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const r = {
    phase,
    runAt: new Date().toISOString(),
    mode: "isolated SQL and synthetic I/O; no network or model calls",
    metrics: {},
    outputs: {},
  };
  const context = {
    scope: { audience: "mine" },
    fetchedAt: "2026-10-27T03:00:00Z",
    date: "2026-10-27",
    timeZone: "Asia/Ho_Chi_Minh",
    days: 7,
    projectIds: [],
    busy: [],
    busyPartial: false,
    schedulingBasis: "calendar",
    detailPartial: false,
    freeSlots: Array.from({ length: 30 }, () => ({
      startAt: "2026-10-28T02:00:00Z",
      endAt: "2026-10-28T03:00:00Z",
    })),
    focusPerTask: [],
    sources: { project: { state: "ready" }, calendar: { state: "ready" } },
    metrics: { project: { open: 900 } },
    tasks: Array.from({ length: 60 }, (_, i) => ({
      id: uuid(1000 + i),
      kind: "project",
      projectId: uuid(2),
      title: 'Task "' + i + '" \n😀',
      description: "Chi tiết công việc ".repeat(50),
      status: "TODO",
      priority: "HIGH",
      dueAt: null,
      allDay: false,
      overdue: false,
      dueToday: false,
      url: "/projects/" + uuid(2),
      checklist: Array.from({ length: 8 }, () => ({
        title: "Checklist detail".repeat(10),
        completed: false,
      })),
      blockedBy: [],
      childCount: 0,
      checklistCount: 8,
      unblocks: 0,
    })),
  };
  r.outputs.packing = hash(
    [0, 800, 5000, 20000, 100000].map((b) => agent.modelContext(context, b)),
  );
  r.metrics.contextPacking = await measure(() => {
    for (let i = 0; i < 100; i++) agent.modelContext(context, 20000);
  });
  r.metrics.contextPacking.contextsPerSample = 100;
  const pg = new PGlite();
  try {
    for (const f of [
      "001_notebooks.sql",
      "003_work_assistant.sql",
      "004_work_assistant_conversations.sql",
      ...(phase === "after" ? ["005_ai_performance.sql"] : []),
    ])
      await pg.exec(
        fs.readFileSync(path.join(__dirname, "../migrations", f), "utf8"),
      );
    const actor = { id: uuid(1), email: "fixture@example.test" },
      project = uuid(2),
      source = uuid(3),
      notebook = uuid(4);
    await pg.query(
      "INSERT INTO notebook_ai.work_assistant_sessions(id,owner_id,project_id,scope_key,updated_at) SELECT md5(i::text)::uuid,$1::uuid,CASE WHEN i%4=0 THEN NULL WHEN i%4=1 THEN $2::uuid ELSE md5('p'||i)::uuid END,md5(i::text),timestamptz '2026-10-27 03:00:00+00'-make_interval(secs=>i) FROM generate_series(1,500) i",
      [actor.id, project],
    );
    await pg.exec(
      "INSERT INTO notebook_ai.work_assistant_requests(id,session_id,owner_id,status) SELECT md5(s.id::text||'-r-'||i)::uuid,s.id,s.owner_id,'COMPLETED' FROM notebook_ai.work_assistant_sessions s CROSS JOIN generate_series(1,10) i",
    );
    await pg.exec(
      "INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content,created_at) SELECT md5(r.id::text||'-m-'||i)::uuid,r.session_id,r.id,CASE WHEN i=0 THEN 'user' ELSE 'assistant' END,repeat('Fixture text, no private data. ',100),timestamptz '2026-10-27 03:00:00+00'+make_interval(secs=>r.n*2+i) FROM (SELECT *,row_number() OVER(PARTITION BY session_id ORDER BY id)::int n FROM notebook_ai.work_assistant_requests) r CROSS JOIN generate_series(0,1) i",
    );
    await pg.query(
      "INSERT INTO notebook_ai.notebooks(id,owner_id,title) VALUES($1,$2,'Fixture')",
      [notebook, actor.id],
    );
    await pg.query(
      "INSERT INTO notebook_ai.sources(id,notebook_id,document_id,version_id,revision,name,size_bytes,owner_email,status) VALUES($1,$2,$3,$4,'fixture','Fixture',1,'fixture@example.test','READY')",
      [source, notebook, uuid(5), uuid(6)],
    );
    const citations = Array.from({ length: 30 }, (_, i) => ({
      label: "S" + (i + 1),
      sourceId: source,
      imageId: String(i).padStart(64, "0"),
    }));
    for (const c of citations.slice(-2))
      await pg.query(
        "INSERT INTO notebook_ai.source_visuals(source_id,revision,image_id,image_hash,data_url) VALUES($1,'fixture',$2,$2,$3)",
        [source, c.imageId, "data:image/png;base64,fixture" + c.label],
      );
    await pg.exec("ANALYZE");
    let queries = [];
    db.rows = async (sql, args = []) => {
      queries.push({ sql, args });
      return (await pg.query(sql, args)).rows;
    };
    db.transaction = (run) =>
      pg.transaction((tx) =>
        run({ query: (sql, args) => tx.query(sql, args) }),
      );
    const store = new WorkStore(),
      session = await store.session(actor, project),
      history = async () =>
        store.recent
          ? store.recent(session)
          : (await store.history(session)).messages.slice(-4);
    r.outputs.history = hash(
      (await history()).map((m) => [m.id, m.role, m.content]),
    );
    queries = [];
    await history();
    const hq = queries.at(-1),
      transferred = (await pg.query(hq.sql, hq.args)).rows;
    r.metrics.history = {
      ...(await measure(history)),
      rowsFetched: transferred.length,
      bytesFetched: Buffer.byteLength(JSON.stringify(transferred)),
    };
    const list = () => store.list(actor, project);
    r.outputs.sessions = hash(
      (await list()).sessions.map((s) => [s.id, s.content, s.project_ids]),
    );
    queries = [];
    await list();
    const sq = queries.at(-1);
    r.metrics.sessionList = await measure(list);
    r.metrics.sessionList.queryPlan = (
      await pg.query("EXPLAIN (ANALYZE,FORMAT JSON) " + sq.sql, sq.args)
    ).rows[0]["QUERY PLAN"];
    config.VISUAL_ENABLED = "true";
    const images = () =>
      visualEvidence("describe the image", citations, [
        { id: source, status: "READY", revision: "fixture" },
      ]);
    r.outputs.images = hash(await images());
    queries = [];
    await images();
    const count = queries.length;
    r.metrics.images = { ...(await measure(images)), queriesPerRequest: count };
  } finally {
    await pg.close();
    await db.db.end();
  }
  const original = agent.workAnswer;
  agent.workAnswer = async () => ({
    content: "fixture",
    referenceTasks: [],
    context: {
      projectIds: [],
      fetchedAt: "2026-10-27T03:00:00Z",
      timeZone: "Asia/Ho_Chi_Minh",
      days: 7,
      sources: {},
    },
  });
  try {
    const recent = async () => {
        await sleep(8);
        return [];
      },
      service = new WorkAssistantService(
        {
          begin: async () => {},
          history: async () => ({ messages: await recent() }),
          recent,
          canceled: async () => false,
          finish: async () => ({ id: uuid(10) }),
          fail: async () => {},
        },
        {
          authorize: async () => {
            await sleep(8);
            return new Set();
          },
          read: async () => {
            await sleep(16);
            return { scope: { audience: "mine" }, projectIds: [] };
          },
        },
      );
    const run = async () => {
      const res = new EventEmitter();
      res.status = res.set = () => res;
      res.flushHeaders = () => {};
      res.write = () => true;
      res.end = () => {};
      await service.answer(
        { actor: { id: uuid(1) } },
        res,
        { id: uuid(10), project_id: null },
        "fixture",
        uuid(11),
        "mine",
      );
    };
    r.metrics.sourcePreparation = {
      ...(await measure(run)),
      simulatedHistoryMs: 8,
      simulatedAuthorizationMs: 8,
      simulatedContextMs: 16,
    };
  } finally {
    agent.workAnswer = original;
  }
  const timers = require("node:timers/promises"),
    llm = require("../dist/infrastructure/integrations/llm.client"),
    {
      ModelMinuteQuotaException,
    } = require("../dist/common/errors/model-quota.exception"),
    {
      admitConversationModel,
    } = require("../dist/modules/conversation-ai/model-admission"),
    originals = {
      now: performance.now,
      sleep: timers.setTimeout,
      admit: llm.admitModel,
      random: Math.random,
    };
  let clock = 0,
    attempts = 0;
  Object.defineProperty(performance, "now", {
    value: () => clock,
    configurable: true,
  });
  Math.random = () => 0;
  timers.setTimeout = async (d) => {
    clock += d;
  };
  llm.admitModel = async () => {
    attempts++;
    if (clock < 58000) throw new ModelMinuteQuotaException(58000 - clock);
  };
  try {
    await admitConversationModel(1000, "fixture", new AbortController().signal);
  } finally {
    Object.defineProperty(performance, "now", {
      value: originals.now,
      configurable: true,
    });
    timers.setTimeout = originals.sleep;
    llm.admitModel = originals.admit;
    Math.random = originals.random;
  }
  r.metrics.quotaWait = {
    admissionAttempts: attempts,
    simulatedElapsedMs: clock,
    providerCalls: 0,
  };
  if (phase === "after") {
    const b = JSON.parse(
      fs.readFileSync(path.join(out, "before.json"), "utf8"),
    );
    assert.deepEqual(
      r.outputs,
      b.outputs,
      "Optimization changed deterministic outputs",
    );
    r.outputParity = true;
  }
  fs.writeFileSync(
    path.join(out, phase + ".json"),
    JSON.stringify(r, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      ...r,
      metrics: {
        ...r.metrics,
        sessionList: { ...r.metrics.sessionList, queryPlan: "saved to report" },
      },
    }),
  );
})().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
