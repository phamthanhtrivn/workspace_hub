const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Readable, PassThrough } = require("node:stream");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
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
require.cache[require.resolve("../dist/infrastructure/queue/notebook.queue")] =
  { exports: {} };
const uploads = require("../dist/modules/sources/upload-validation");
const { rag } = require("../dist/infrastructure/integrations/rag.client");
const { db } = require("../dist/infrastructure/database/database");
const MiB = 1024 * 1024;

test("file metadata and notebook capacity reject empty/oversized/unsupported content before reading bytes", () => {
  for (const [name, size] of [
    ["a.pdf", 0],
    ["a.exe", 1],
    ["a.pdf", 20 * MiB + 1],
    ["a.md", NaN],
  ])
    assert.throws(() => uploads.checkFile(name, size));
  uploads.checkFile("A.PDF", 20 * MiB);
  uploads.checkCapacity([{ size_bytes: 30 * MiB }], 1, 20 * MiB);
  assert.throws(() =>
    uploads.checkCapacity([{ size_bytes: 30 * MiB + 1 }], 1, 20 * MiB),
  );
  assert.throws(() =>
    uploads.checkCapacity(Array(5).fill({ size_bytes: 1 }), 1, 1),
  );
  const manifest = {
    documentId: "a",
    versionId: "b",
    current: true,
    name: "a.md",
    sizeBytes: 1,
  };
  assert.equal(uploads.checkManifests([], [manifest, manifest]).length, 1);
});

test("bounded raw reader checks actual bytes, declared length and stalled uploads", async () => {
  assert.equal(
    (
      await uploads.readUpload(Readable.from([Buffer.from("file")]), 4)
    ).toString(),
    "file",
  );
  await assert.rejects(
    uploads.readUpload(Readable.from([Buffer.from("file")]), 3),
    (e) => e.getStatus() === 413,
  );
  await assert.rejects(
    uploads.readUpload(Readable.from([Buffer.from("f")]), 4),
    (e) => e.getStatus() === 400,
  );
  const stream = new PassThrough();
  await assert.rejects(
    uploads.readUpload(stream, 1, 10),
    (e) => e.getStatus() === 408,
  );
  assert.equal(stream.listenerCount("data"), 0);
  stream.destroy();
});

test("preflight has bounded concurrency and always releases its slot after failure", async () => {
  let release;
  const pending = uploads.withUploadCheck(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  await assert.rejects(
    uploads.withUploadCheck(async () => {}),
    (e) => e.getStatus() === 429,
  );
  release();
  await pending;
  await assert.rejects(
    uploads.withUploadCheck(async () => {
      throw new Error("invalid");
    }),
  );
  assert.equal(
    await uploads.withUploadCheck(async () => "released"),
    "released",
  );
});

test("stored-file download checks actual size and parser reasons are mapped to safe, specific messages", async (t) => {
  const original = global.fetch;
  t.after(() => {
    global.fetch = original;
  });
  const file = {
    name: "a.md",
    sizeBytes: 3,
    downloadUrl: "https://storage.invalid/signed-private-url",
  };
  global.fetch = async (_url, options) => {
    assert.equal(options.redirect, "error");
    return new Response("abc");
  };
  assert.equal((await uploads.downloadSource(file)).toString(), "abc");
  global.fetch = async () => new Response("abcd");
  await assert.rejects(
    uploads.downloadSource(file),
    (e) => e.getStatus() === 413,
  );
  for (const [code, message] of [
    ["PDF_PAGE_LIMIT", /100 trang/],
    ["PDF_OCR_REQUIRED", /OCR/],
    ["PDF_ENCRYPTED", /mật khẩu/],
    ["SOURCE_TOKEN_LIMIT", /40.000 token/],
    ["secret-provider-body", /File hỏng/],
  ]) {
    global.fetch = async () =>
      Response.json({ detail: { code } }, { status: 422 });
    await assert.rejects(
      rag("/validate", {}),
      (e) =>
        e.getStatus() === 400 &&
        message.test(e.message) &&
        !e.message.includes("secret"),
    );
  }
});

test("authenticated preflight endpoint validates transient bytes without creating sources", async (t) => {
  const { Module, NotFoundException } = require("@nestjs/common");
  const { NestFactory } = require("@nestjs/core");
  const { json } = require("express");
  const {
    SourcesController,
  } = require("../dist/modules/sources/sources.controller");
  const { SourcesService } = require("../dist/modules/sources/sources.service");
  const { AuthGuard } = require("../dist/common/auth/auth.guard");
  const actorId = randomUUID(),
    notebookId = randomUUID();
  const notebookAccess = require("../dist/common/auth/notebook-access");
  t.mock.method(notebookAccess, "ownedNotebook", async (_actor, id) => {
    if (id !== notebookId) throw new NotFoundException();
  });
  const headers = {
    "x-workspace-gateway-key": process.env.AI_GATEWAY_KEY,
    "x-user-id": actorId,
    "x-user-email": "owner@example.test",
    "content-type": "application/octet-stream",
    "x-file-size": "4",
    "x-upload-count": "1",
    "x-upload-bytes": "4",
  };
  let checks = 0;
  const original = uploads.validateContent;
  uploads.validateContent = async (name, content, scopeId) => {
    checks++;
    assert.equal(name, "a.txt");
    assert.equal(content.toString(), "file");
    assert.equal(scopeId, notebookId);
    return { chunkCount: 1 };
  };
  class App {}
  Module({
    controllers: [SourcesController],
    providers: [
      AuthGuard,
      {
        provide: SourcesService,
        useValue: {
          sources: async () => [],
          add: async () => {
            assert.fail("Preflight must not create source or enqueue job");
          },
        },
      },
    ],
  })(App);
  const app = await NestFactory.create(App, {
    logger: false,
    bodyParser: false,
  });
  app.use(json({ limit: "64kb" }));
  t.after(async () => {
    uploads.validateContent = original;
    await app.close();
    await db.end();
  });
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  const post = (id, overrides = {}) =>
    fetch(`${base}/api/ai/notebooks/${id}/upload-checks?name=a.txt`, {
      method: "POST",
      body: "file",
      headers: { ...headers, ...overrides },
    });
  assert.equal(
    (await post(notebookId, { "x-workspace-gateway-key": "" })).status,
    401,
  );
  assert.equal((await post(randomUUID())).status, 404);
  assert.equal(
    (await post(notebookId, { "x-file-size": String(20 * MiB + 1) })).status,
    413,
  );
  assert.equal((await post(notebookId, { "x-upload-count": "6" })).status, 400);
  assert.equal(
    (await post(notebookId, { "x-upload-bytes": String(50 * MiB + 1) })).status,
    413,
  );
  assert.equal(checks, 0);
  const response = await post(notebookId);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { chunkCount: 1 } });
  assert.equal(checks, 1);
  const large = Buffer.alloc(65 * 1024, 97);
  uploads.validateContent = async (_name, content) => {
    assert.equal(content.length, large.length);
    return { chunkCount: 2 };
  };
  const binary = await fetch(
    `${base}/api/ai/notebooks/${notebookId}/upload-checks?name=a.txt`,
    {
      method: "POST",
      body: large,
      headers: {
        ...headers,
        "x-file-size": String(large.length),
        "x-upload-bytes": String(large.length),
      },
    },
  );
  assert.equal(
    binary.status,
    201,
    "Raw upload must not hit the 64 KiB JSON body limit",
  );
});

test("both gateway templates permit bounded AI file checks and their CORS metadata", () => {
  for (const name of ["kong.host.yml", "kong.docker.yml"]) {
    const yaml = readFileSync(`../kong-gateway/${name}`, "utf8");
    assert.match(
      yaml,
      /name: request-size-limiting\s+route: notebook-ai-routes\s+config:\s+allowed_payload_size: 20/,
    );
    for (const header of ["X-File-Size", "X-Upload-Count", "X-Upload-Bytes"])
      assert.ok(yaml.includes(`- ${header}`));
  }
});
