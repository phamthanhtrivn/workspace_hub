const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env-file",
  VISUAL_ENABLED: "false",
  NODE_ENV: "test",
  INTERNAL_SERVICE_KEY: "",
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
const {
  resolveDocuments,
  authorizeSources,
} = require("../dist/infrastructure/integrations/document.client");
const { rag } = require("../dist/infrastructure/integrations/rag.client");
const actor = { id: randomUUID(), email: "owner@example.test" };
const source = {
  document_id: randomUUID(),
  version_id: randomUUID(),
  revision: "r1",
};
const manifest = {
  documentId: source.document_id,
  versionId: source.version_id,
  revision: "r1",
  current: true,
};

test("internal document request forwards gateway actor and exact refs using the existing service-key protocol", async (t) => {
  const original = global.fetch;
  t.after(() => {
    global.fetch = original;
  });
  global.fetch = async (url, options) => {
    assert.equal(
      url,
      "http://localhost:8085/internal/notebook-documents/resolve",
    );
    assert.equal(
      options.headers["x-internal-service-key"],
      process.env.AI_DOCUMENT_SERVICE_KEY,
    );
    assert.equal(options.headers["x-ai-delegation"], undefined);
    assert.deepEqual(JSON.parse(options.body), {
      userId: actor.id,
      userEmail: actor.email,
      refs: [{ documentId: source.document_id, versionId: source.version_id }],
      download: true,
    });
    return Response.json({ message: "Sources resolved", data: [manifest] });
  };
  assert.deepEqual(await authorizeSources(actor, [source], true), [manifest]);
});

test("RAG calls use only the dedicated worker credential and fail closed on authentication failure", async (t) => {
  const original = global.fetch;
  t.after(() => {
    global.fetch = original;
  });
  global.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:8088/chunks");
    assert.equal(
      options.headers["x-internal-service-key"],
      process.env.RAG_SERVICE_KEY,
    );
    assert.notEqual(
      options.headers["x-internal-service-key"],
      process.env.AI_DOCUMENT_SERVICE_KEY,
    );
    assert.equal(options.redirect, "error");
    return new Response("", { status: 401 });
  };
  await assert.rejects(rag("/chunks", {}), (e) => e.getStatus() === 503);
});

test("internal protocol still fails closed for revoked permissions and changed versions", async (t) => {
  const original = global.fetch;
  t.after(() => {
    global.fetch = original;
  });
  global.fetch = async () => new Response("", { status: 403 });
  await assert.rejects(
    resolveDocuments(actor, [{ documentId: source.document_id }]),
    (e) => e.getStatus() === 403,
  );
  for (const changed of [
    { ...manifest, current: false },
    { ...manifest, revision: "r2" },
    { ...manifest, versionId: randomUUID() },
  ]) {
    global.fetch = async () => Response.json({ data: [changed] });
    await assert.rejects(
      authorizeSources(actor, [source]),
      (e) => e.getStatus() === 403,
    );
  }
  global.fetch = async () => new Response("", { status: 401 });
  await assert.rejects(
    resolveDocuments(actor, [{ documentId: source.document_id }]),
    (e) => e.getStatus() === 503,
  );
});
