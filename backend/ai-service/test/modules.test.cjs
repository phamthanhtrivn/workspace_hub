const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync, readdirSync } = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");

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
let heartbeat = "ready";
require.cache[require.resolve("../dist/infrastructure/queue/notebook.queue")] =
  {
    exports: {
      queue: {
        getJobCounts: async () => ({ waiting: 0 }),
        client: Promise.resolve({ get: async () => heartbeat }),
      },
      summaryQueue: { getJobCounts: async () => ({ waiting: 0 }) },
      enqueue: async () => {},
      closeQueues: async () => {},
      WORKER_HEARTBEAT_VALUE: "ready:split-v1",
    },
  };
const database = require("../dist/infrastructure/database/database");
const { AppModule } = require("../dist/app.module");

test("source root contains only entrypoints and the application module", () => {
  assert.deepEqual(
    readdirSync("src")
      .filter((file) => file.endsWith(".ts"))
      .sort(),
    ["app.module.ts", "main.ts", "migrate.ts", "worker.ts"],
  );
});

test(
  "real AppModule wires all feature modules and preserves HTTP routes, ownership and readiness",
  { timeout: 15000 },
  async (t) => {
    const { NestFactory } = require("@nestjs/core");
    const { json } = require("express");
    const pg = new PGlite();
    await pg.exec(readFileSync("migrations/001_notebooks.sql", "utf8"));
    t.mock.method(
      database,
      "rows",
      async (sql, values = []) => (await pg.query(sql, values)).rows,
    );
    t.mock.method(database.db, "query", async (sql, values = []) =>
      pg.query(sql, values),
    );
    const app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
      bodyParser: false,
    });
    app.use(json({ limit: "64kb" }));
    t.after(async () => {
      await app.close();
      await pg.close();
      await database.db.end();
    });
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const realFetch = global.fetch;
    let dependencyCalls = 0;
    t.mock.method(global, "fetch", async (url, options) => {
      if (url === "http://localhost:8088/ready") {
        dependencyCalls++;
        return Response.json({ status: "ok" });
      }
      if (url === "http://localhost:8085/internal/notebook-documents/resolve") {
        dependencyCalls++;
        return Response.json({}, { status: 400 });
      }
      return realFetch(url, options);
    });
    const identity = {
      "x-workspace-gateway-key": process.env.AI_GATEWAY_KEY,
      "x-user-id": randomUUID(),
      "x-user-email": "owner@example.test",
      "content-type": "application/json",
    };
    const send = (path, method = "GET", body, headers = identity) =>
      fetch(`${base}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    assert.equal((await send("/health", "GET", undefined, {})).status, 200);
    assert.equal(
      (await send("/api/ai/notebooks", "GET", undefined, {})).status,
      401,
    );
    assert.deepEqual((await (await send("/api/ai/notebooks")).json()).data, []);
    const created = await send("/api/ai/notebooks", "POST", {
      title: "Module integration",
    });
    assert.equal(created.status, 201);
    const { data: notebook } = await created.json();
    const path = `/api/ai/notebooks/${notebook.id}`;
    assert.equal((await send(path)).status, 200);
    assert.equal(
      (
        await send(path, "GET", undefined, {
          ...identity,
          "x-user-id": randomUUID(),
        })
      ).status,
      404,
    );
    assert.equal((await send(path, "PATCH", { title: "Renamed" })).status, 200);
    const noteResponse = await send(`${path}/notes`, "POST", {
      title: "Manual",
      content: "Kept text",
    });
    assert.equal(noteResponse.status, 201);
    const { data: note } = await noteResponse.json();
    const state = (await (await send(path)).json()).data;
    assert.equal(state.title, "Renamed");
    assert.equal(state.notes[0].content, "Kept text");
    assert.equal(
      (await send(`${path}/notes/${note.id}`, "DELETE")).status,
      200,
    );
    assert.equal(
      (await send(`${path}/sources`, "POST", { refs: [] })).status,
      400,
    );
    assert.equal(
      (await send(`${path}/sources/${randomUUID()}/unknown`, "POST", {}))
        .status,
      400,
    );
    assert.equal(
      (
        await send(`${path}/messages`, "POST", {
          question: "",
          sourceIds: [],
          requestId: randomUUID(),
        })
      ).status,
      400,
    );
    assert.equal(
      (await send(`/api/ai/requests/${randomUUID()}/cancel`, "POST", {}))
        .status,
      201,
    );
    assert.equal(
      (await send(`${path}/artifacts`, "POST", { kind: "SUMMARY" })).status,
      400,
    );
    const invalidUpload = await fetch(
      `${base}${path}/upload-checks?name=a.txt`,
      {
        method: "POST",
        body: "text",
        headers: {
          ...identity,
          "content-type": "application/octet-stream",
          "x-file-size": "0",
          "x-upload-count": "1",
          "x-upload-bytes": "4",
        },
      },
    );
    assert.equal(invalidUpload.status, 400);
    assert.equal((await send("/ready", "GET", undefined, {})).status, 503);
    heartbeat = "ready:split-v1";
    assert.equal((await send("/ready", "GET", undefined, {})).status, 200);
    assert.equal(dependencyCalls, 2);
    assert.equal((await send(path, "DELETE")).status, 200);
    assert.equal((await send(path)).status, 404);
  },
);
