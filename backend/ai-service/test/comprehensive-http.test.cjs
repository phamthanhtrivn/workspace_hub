const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { randomUUID, createHash } = require("node:crypto");
const { readFileSync, readdirSync, mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const workspace = require("../evaluation/workspace.json");
const key = "fixture-comprehensive-key-not-production-00000";
const communicationKey = key + "-communication";
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env", NODE_ENV: "test", AI_ENABLED: "true",
  VISUAL_ENABLED: "false", CONVERSATION_AI_ENABLED: "true", MEETING_SUMMARY_ENABLED: "true",
  AI_GATEWAY_KEY: key, AI_DOCUMENT_SERVICE_KEY: key + "-document", RAG_SERVICE_KEY: key + "-rag",
  AI_COMMUNICATION_SERVICE_KEY: communicationKey, WORK_ASSISTANT_SERVICE_KEY: key + "-work",
  MEETING_STT_SERVICE_KEY: key + "-stt", MEETING_MEDIA_HOSTS: "media.fixture.invalid",
  DATABASE_URL: "postgres://fixture:fixture@localhost/test", REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:1", RAG_WORKER_URL: "http://localhost:1",
  LLM_BASE_URL: "http://localhost:1/v1", LLM_API_KEY: "fixture", LLM_MODEL: "fixture",
  LLM_MAX_TOKENS: "512", LLM_REQUESTS_PER_MINUTE: "100", LLM_REQUESTS_PER_DAY: "1000",
  LLM_TOKENS_PER_MINUTE: "1000000", CHAT_CANCEL_POLL_MS: "500",
});
const jobs = [];
const queue = {
  getJobCounts: async () => ({ waiting: 0 }),
  client: Promise.resolve({ get: async (name) => name.includes("meeting") ? "ready:meeting-v1" : name.includes("conversation") ? "ready:conversation-v1" : "ready:split-v1" }),
  add: async (kind, data, options) => jobs.push({ kind, data, options }),
};
require.cache[require.resolve("../dist/infrastructure/queue/notebook.queue")] = { exports: {
  queue, summaryQueue: queue, conversationQueue: queue, meetingSummaryQueue: queue,
  enqueue: async (kind, id, data) => jobs.push({ kind, id, data }),
  closeQueues: async () => {}, WORKER_HEARTBEAT_VALUE: "ready:split-v1",
} };
const database = require("../dist/infrastructure/database/database");
const { config } = require("../dist/config/env.config");
const { AppModule } = require("../dist/app.module");
const { indexSource } = require("../dist/jobs/index.processor");
const { summarize } = require("../dist/jobs/summary.processor");

test("all implemented API routes run over HTTP with isolated SQL and controlled upstream services", { timeout: 60000 }, async (t) => {
  const pg = new PGlite();
  for (const file of readdirSync("migrations").filter((file) => file.endsWith(".sql")).sort())
    await pg.exec(readFileSync("migrations/" + file, "utf8"));
  t.mock.method(database, "rows", async (sql, args = []) => (await pg.query(sql, args)).rows);
  t.mock.method(database.db, "query", (sql, args = []) => pg.query(sql, args));
  t.mock.method(database, "transaction", (run) => pg.transaction((tx) => run({ query: (sql, args = []) => tx.query(sql, args) })));
  const content = Buffer.from("Demo Atlas ngày 02/11/2026 lúc 09:00. Ngân sách đã duyệt 108 triệu đồng.");
  const documentId = randomUUID(), versionId = randomUUID(), recordingId = randomUUID();
  const revision = createHash("sha256").update(content).digest("hex");
  let upstreamBase, denyDocument = false, ragUnavailable = false, holdModel = false, modelStarted;
  const calls = [];
  const upstream = createServer(async (req, res) => {
    try {
      const parts = [];
      for await (const part of req) parts.push(part);
      const raw = Buffer.concat(parts).toString();
      const body = raw ? JSON.parse(raw) : {};
      const path = new URL(req.url, "http://fixture").pathname;
      calls.push(path);
      const json = (value, status = 200) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(value)); };
      if (path === "/file") { res.writeHead(200, { "content-length": content.length }); res.end(content); return; }
      if (path.endsWith("/resolve")) {
        if (req.headers["x-internal-service-key"] !== config.AI_DOCUMENT_SERVICE_KEY) return json({}, 401);
        if (!body.refs) return json({ error: "Invalid resolve request" }, 400);
        if (denyDocument) return json({ private: "UPSTREAM_PRIVATE_DIAGNOSTIC" }, 403);
        return json({ data: body.refs.map((ref) => ({ documentId: ref.documentId, versionId, revision, name: "atlas.md", sizeBytes: content.length, current: true, ...(body.download ? { downloadUrl: upstreamBase + "/file" } : {}) })) });
      }
      if (path.endsWith("/authorize")) return json({ data: { projectIds: [workspace.projectId] } });
      if (path === "/project/internal/work-assistant/context") return json({ data: workspace.project });
      if (path === "/calendar/internal/work-assistant/context") return json({ data: workspace.calendar });
      if (path.includes("/internal/meeting-summaries/") && path.endsWith("/source"))
        return json({ data: { recordingId, revision, url: "https://media.fixture.invalid/recording.mp4", sizeBytes: 1024, durationSeconds: 45 } });
      if (path === "/ready") return json({ status: "ok" });
      if (["/validate", "/index"].includes(path)) return json({ chunkCount: 1 });
      if (path === "/delete") return json({});
      if (["/retrieve", "/chunks"].includes(path)) {
        if (ragUnavailable) return json({ private: "UPSTREAM_PRIVATE_DIAGNOSTIC" }, 503);
        return json({ evidence: body.sourceIds.map((sourceId) => ({ id: "chunk-one", sourceId, text: content.toString(), position: 0, page: 1 })) });
      }
      if (path === "/v1/chat/completions") {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: "Demo Atlas ngày 02/11 lúc 09:00. [[S1]]" }, finish_reason: null }] }) + '\n\n');
        if (holdModel) { modelStarted?.(); return; }
        res.end('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] }) + '\n\ndata: [DONE]\n\n');
        return;
      }
      json({ error: "Unknown fixture path" }, 404);
    } catch { res.writeHead(500); res.end(); }
  });
  await new Promise((done) => upstream.listen(0, "127.0.0.1", done));
  upstreamBase = "http://127.0.0.1:" + upstream.address().port;
  Object.assign(config, {
    DOCUMENT_SERVICE_URL: upstreamBase, RAG_WORKER_URL: upstreamBase, LLM_BASE_URL: upstreamBase + "/v1",
    COMMUNICATION_SERVICE_URL: upstreamBase, MEETING_STT_URL: upstreamBase,
    WORK_ASSISTANT_PROJECT_URL: upstreamBase + "/project",
    WORK_ASSISTANT_CALENDAR_URL: upstreamBase + "/calendar",
  });
  const { ChatOpenAI } = require("@langchain/openai");
  const { AIMessage } = require("@langchain/core/messages");
  t.mock.method(ChatOpenAI.prototype, "bindTools", () => ({ invoke: async () => new AIMessage("Ưu tiên sửa callback quá hạn. Chưa thay đổi dữ liệu.") }));
  const { NestFactory } = require("@nestjs/core");
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false, bodyParser: false });
  app.use(require("express").json({ limit: "64kb" }));
  await app.listen(0, "127.0.0.1");
  t.after(async () => {
    await app.close(); upstream.closeAllConnections();
    await new Promise((done) => upstream.close(done));
    await pg.close(); await database.db.end();
  });
  const base = await app.getUrl();
  const identity = { "x-workspace-gateway-key": key, "x-user-id": workspace.actor.id, "x-user-email": workspace.actor.email };
  const { PATH_METADATA, METHOD_METADATA } = require("@nestjs/common/constants");
  const methodNames = require("@nestjs/common").RequestMethod;
  const routes = [];
  for (const file of readdirSync("src", { recursive: true }).filter((file) => file.endsWith(".controller.ts"))) {
    const exports = require(resolve("dist", file.replace(/\.ts$/, ".js")));
    for (const controller of Object.values(exports)) {
      if (typeof controller !== "function" || Reflect.getMetadata(PATH_METADATA, controller) === undefined) continue;
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = controller.prototype[name];
        const method = Reflect.getMetadata(METHOD_METADATA, handler);
        if (method === undefined) continue;
        const path = "/" + [Reflect.getMetadata(PATH_METADATA, controller), Reflect.getMetadata(PATH_METADATA, handler)].map((part) => (part ?? "").replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
        routes.push({ method: methodNames[method], path, statuses: new Set(), requests: 0, timings: [], actions: new Set(), regex: new RegExp("^" + path.replace(/:[^/]+/g, "[^/]+") + "$") });
      }
    }
  }
  const send = async (method, path, body, options = {}) => {
    const started = performance.now();
    const response = await fetch(base + path, {
      method, signal: AbortSignal.timeout(10000),
      headers: { "content-type": "application/json", ...identity, ...options.headers },
      ...(body === undefined ? {} : { body: options.raw ? body : JSON.stringify(body) }),
    });
    const text = await response.text();
    const route = routes.find((route) => route.method === method && route.regex.test(path.split("?")[0]));
    if (route) {
      route.statuses.add(response.status); route.requests++; route.timings.push(performance.now() - started);
      if (route.path.endsWith(":action")) route.actions.add(path.split("/").at(-1));
    }
    assert.ok(!text.includes("UPSTREAM_PRIVATE_DIAGNOSTIC"));
    return { status: response.status, text, headers: response.headers, json: response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : null };
  };
  const expect = async (method, path, body, status, options) => {
    const result = await send(method, path, body, options);
    assert.equal(result.status, status, `${method} ${path}: ${result.text.slice(0, 200)}`);
    return result;
  };
  let notebookId, sourceId, noteId;
  const notebookPath = () => "/api/ai/notebooks/" + notebookId;
  await t.test("all business routes reject forged proof; malformed JSON, UUIDs and oversized payloads fail safely", async () => {
    for (const route of routes.filter((route) => route.path.startsWith("/api/"))) {
      const path = route.path.replace(/:[^/]+/g, randomUUID());
      await expect(route.method, path, route.method === "GET" ? undefined : {}, 401, { headers: { "x-workspace-gateway-key": "forged" } });
      if (route.path.includes(":")) await expect(route.method, route.path.replace(/:[^/]+/g, "bad-id"), route.method === "GET" ? undefined : {}, 400);
    }
    await expect("POST", "/api/ai/notebooks", "{", 400, { raw: true });
    await expect("POST", "/api/ai/notebooks", { title: "x".repeat(70000) }, 413);
    await expect("POST", "/api/ai/notebooks", { title: " " }, 400);
    await expect("GET", "/api/ai/notebooks", undefined, 401, { headers: { "x-user-role": "RESET_PASSWORD_ROLE" } });
  });
  await t.test("health/readiness and notebook CRUD preserve actual response envelopes and ownership", async () => {
    assert.equal((await expect("GET", "/health", undefined, 200)).json.service, "notebook-ai");
    await expect("GET", "/ready", undefined, 200);
    const result = await expect("POST", "/api/ai/notebooks", { title: "Atlas QA ' ; DROP TABLE notebook_ai.notebooks; --" }, 201);
    notebookId = result.json.data.id;
    assert.equal((await expect("GET", "/api/ai/notebooks", undefined, 200)).json.data.length, 1);
    await expect("GET", notebookPath(), undefined, 404, { headers: { "x-user-id": randomUUID() } });
    await expect("PATCH", notebookPath(), { title: "Atlas QA" }, 200);
    assert.equal((await expect("GET", notebookPath(), undefined, 200)).json.data.title, "Atlas QA");
  });
  await t.test("upload preflight, exact Document source, index job, preview and visual permission checks", async () => {
    await expect("POST", notebookPath() + "/upload-checks?name=atlas.md", content, 201, { raw: true, headers: { "content-type": "application/octet-stream", "x-file-size": String(content.length), "x-upload-count": "1", "x-upload-bytes": String(content.length) } });
    const added = await expect("POST", notebookPath() + "/sources", { refs: [{ documentId }] }, 201);
    sourceId = added.json.data[0].id;
    assert.ok(jobs.some((job) => job.kind === "index" && job.id === sourceId));
    await indexSource(sourceId);
    const state = (await expect("GET", notebookPath(), undefined, 200)).json.data;
    assert.equal(state.sources[0].status, "READY");
    assert.equal((await expect("POST", notebookPath() + "/sources/" + sourceId + "/preview", {}, 201)).json.data.url, upstreamBase + "/file");
    const imageId = "a".repeat(64);
    await pg.query("INSERT INTO notebook_ai.source_visuals(source_id,revision,image_id,image_hash,data_url,description) VALUES($1,$2,$3,$3,$4,$5)", [sourceId, revision, imageId, "data:image/jpeg;base64,YQ==", "Synthetic visual fixture"]);
    await expect("POST", notebookPath() + "/sources/" + sourceId + "/images/" + imageId, {}, 201);
    await expect("POST", notebookPath() + "/sources/" + sourceId + "/images/not-a-hash", {}, 404);
    denyDocument = true;
    await expect("POST", notebookPath() + "/sources/" + sourceId + "/preview", {}, 403);
    denyDocument = false;
  });
  await t.test("chat streams cited UTF-8, persists history, rejects duplicate IDs and reports upstream failures", async () => {
    const requestId = randomUUID();
    const body = { requestId, question: "Demo Atlas vào lúc nào?", sourceIds: [sourceId] };
    const answer = await expect("POST", notebookPath() + "/messages", body, 200);
    assert.match(answer.headers.get("content-type"), /text\/event-stream/);
    assert.match(answer.text, /event: delta/); assert.match(answer.text, /event: done/);
    assert.match(answer.text, /02\/11/);
    await expect("POST", notebookPath() + "/messages", body, 409);
    await expect("POST", notebookPath() + "/messages", { ...body, requestId: randomUUID(), question: "x".repeat(4001) }, 400);
    await expect("POST", notebookPath() + "/messages", { ...body, requestId: randomUUID(), sourceIds: [randomUUID()] }, 400);
    const history = (await expect("GET", notebookPath(), undefined, 200)).json.data.messages;
    assert.ok(history.some((message) => message.role === "ASSISTANT" && message.citations.length === 1));
    ragUnavailable = true;
    const failedId = randomUUID();
    const failure = await expect("POST", notebookPath() + "/messages", { ...body, requestId: failedId }, 200);
    assert.match(failure.text, /event: error/); assert.doesNotMatch(failure.text, /event: done/);
    assert.equal((await pg.query("SELECT status FROM notebook_ai.requests WHERE id=$1", [failedId])).rows[0].status, "FAILED");
    ragUnavailable = false;
  });
  await t.test("Studio manual/saved notes and full-source summary execute and persist checkpoints", async () => {
    noteId = (await expect("POST", notebookPath() + "/notes", { title: "QA note", content: "Synthetic note" }, 201)).json.data.id;
    await expect("POST", notebookPath() + "/notes", { title: "Empty" }, 400);
    const assistant = (await pg.query("SELECT id FROM notebook_ai.messages WHERE notebook_id=$1 AND role='ASSISTANT'", [notebookId])).rows[0];
    await expect("POST", notebookPath() + "/notes", { title: "Saved answer", messageId: assistant.id }, 201);
    const artifact = (await expect("POST", notebookPath() + "/artifacts", { kind: "SUMMARY", sourceIds: [sourceId] }, 201)).json.data;
    await summarize(artifact.id);
    assert.equal((await pg.query("SELECT status FROM notebook_ai.artifacts WHERE id=$1", [artifact.id])).rows[0].status, "COMPLETED");
    await expect("POST", notebookPath() + "/artifacts", { kind: "QUIZ" }, 400);
    await expect("DELETE", notebookPath() + "/notes/" + noteId, undefined, 200);
  });
  await t.test("Work Assistant overview, sessions, history, scoped SSE and cancel keep exact context", async () => {
    const overview = await expect("GET", "/api/ai/work-assistant/overview", undefined, 200);
    assert.equal(overview.json.data.metrics.project.completedInPeriod, 5);
    await expect("GET", "/api/ai/work-assistant/overview?audience=project", undefined, 400);
    const session = (await expect("POST", "/api/ai/work-assistant/sessions", {}, 201)).json.data;
    await expect("GET", "/api/ai/work-assistant/session?sessionId=" + session.id, undefined, 200);
    await expect("GET", "/api/ai/work-assistant/sessions", undefined, 200);
    const requestId = randomUUID();
    const answer = await expect("POST", "/api/ai/work-assistant/sessions/" + session.id + "/messages", { question: "Việc nào nên làm trước?", requestId }, 200);
    assert.match(answer.text, /event: request/); assert.match(answer.text, /event: done/);
    assert.equal((await pg.query("SELECT count(*)::int AS count FROM notebook_ai.work_assistant_messages WHERE request_id=$1", [requestId])).rows[0].count, 2);
    await expect("POST", "/api/ai/work-assistant/requests/" + requestId + "/cancel", {}, 201);
    await expect("GET", "/api/ai/work-assistant/session?sessionId=" + session.id, undefined, 404, { headers: { "x-user-id": randomUUID() } });
  });
  await t.test("internal conversation and meeting APIs require purpose-specific credentials and queue once", async () => {
    const path = "/internal/conversation-ai/" + randomUUID();
    await expect("POST", path, {}, 401);
    await expect("POST", path, {}, 401, { headers: { "x-internal-service-key": key } });
    await expect("POST", path, {}, 201, { headers: { "x-internal-service-key": communicationKey } });
    const meeting = "/internal/meeting-summaries/" + recordingId;
    await expect("POST", meeting + "/status", {}, 401);
    assert.equal((await expect("POST", meeting + "/status", {}, 201, { headers: { "x-internal-service-key": communicationKey } })).json.status, "NOT_CREATED");
    await expect("POST", meeting, { actorId: workspace.actor.id }, 401);
    await expect("POST", meeting, { actorId: workspace.actor.id }, 401, { headers: { "x-internal-service-key": key } });
    await expect("POST", meeting, { actorId: "not-a-uuid" }, 400, { headers: { "x-internal-service-key": communicationKey } });
    for (let index = 0; index < 2; index++)
      await expect("POST", meeting, { actorId: workspace.actor.id }, 201, { headers: { "x-internal-service-key": communicationKey } });
    assert.equal(jobs.filter((job) => job.kind === "meeting-summary").length, 1);
  });
  await t.test("concurrent chat admission returns conflict and remote cancellation aborts an open HTTP model stream", async () => {
    holdModel = true;
    const started = new Promise((done) => { modelStarted = done; });
    const requestId = randomUUID();
    const body = { question: "Hãy cho biết lịch demo Atlas?", sourceIds: [sourceId], requestId };
    const pending = send("POST", notebookPath() + "/messages", body);
    let timeout;
    try {
      await Promise.race([started, new Promise((_, reject) => { timeout = setTimeout(() => reject(Error("Model stream did not start")), 5000); })]);
    } finally { clearTimeout(timeout); }
    await expect("POST", notebookPath() + "/messages", { ...body, requestId: randomUUID() }, 409);
    await expect("POST", "/api/ai/requests/" + requestId + "/cancel", {}, 201);
    const canceled = await pending;
    assert.match(canceled.text, /event: error/); assert.doesNotMatch(canceled.text, /event: done/);
    assert.equal((await pg.query("SELECT status FROM notebook_ai.requests WHERE id=$1", [requestId])).rows[0].status, "CANCELLED");
    holdModel = false;
  });
  await t.test("source retry/removal and notebook deletion preserve SQL constraints and enqueue cleanup", async () => {
    await expect("POST", notebookPath() + "/sources/" + sourceId + "/retry", {}, 201);
    await expect("POST", notebookPath() + "/sources/" + sourceId + "/remove", {}, 201);
    assert.equal((await pg.query("SELECT count(*)::int count FROM notebook_ai.sources WHERE id=$1", [sourceId])).rows[0].count, 0);
    await expect("DELETE", notebookPath(), undefined, 200);
    await expect("GET", notebookPath(), undefined, 404);
    assert.ok(jobs.some((job) => job.kind === "cleanup"));
  });
  await t.test("runtime route inventory has successful HTTP evidence for every implemented route", () => {
    for (const route of routes) {
      assert.ok(route.requests, `Untested route ${route.method} ${route.path}`);
      assert.ok([...route.statuses].some((status) => status >= 200 && status < 300), `No success for ${route.method} ${route.path}`);
      if (route.path.endsWith(":action")) for (const action of ["retry", "remove", "preview"]) assert.ok(route.actions.has(action));
    }
    const target = resolve("../../docs/testing/ai-comprehensive");
    mkdirSync(target, { recursive: true });
    writeFileSync(resolve(target, "http-coverage.json"), JSON.stringify({
      runAt: new Date().toISOString(), mode: "real Nest HTTP and upstream HTTP sockets; PGlite SQL; fixture Redis/BullMQ and model outputs",
      routes: routes.map(({ method, path, statuses, requests, timings }) => ({ method, path, statuses: [...statuses].sort(), requests, maxMs: Math.round(Math.max(...timings)) })),
      upstreamCalls: calls.length, queuedOperations: jobs.length,
    }, null, 2) + "\n");
  });
});
