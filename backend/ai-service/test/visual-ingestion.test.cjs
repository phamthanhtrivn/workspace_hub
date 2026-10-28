const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");
Object.assign(process.env, {
  NODE_ENV: "test",
  DOTENV_CONFIG_PATH: "test/no-env-file",
  AI_ENABLED: "true",
  AI_GATEWAY_KEY: "fixture-gateway-proof-not-production-000",
  AI_DOCUMENT_SERVICE_KEY: "fixture-ai-document-not-production-000",
  RAG_SERVICE_KEY: "fixture-rag-service-not-production-000",
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://vibi.top/v1/",
  LLM_API_KEY: "fixture-only",
  LLM_MODEL: "deepseek-v4.1-flash",
  VISUAL_ENABLED: "true",
});
require.cache[require.resolve("../dist/infrastructure/queue/notebook.queue")] =
  { exports: { enqueue: async () => {} } };
const database = require("../dist/infrastructure/database/database");
const documents = require("../dist/infrastructure/integrations/document.client");
const rag = require("../dist/infrastructure/integrations/rag.client");
const llm = require("../dist/infrastructure/integrations/llm.client");
const vision = require("../dist/infrastructure/integrations/vision.client");
const { config } = require("../dist/config/env.config");
const { enrichVisualSource } = require("../dist/jobs/visual-ingestion");
const { SourcesService } = require("../dist/modules/sources/sources.service");
const { StudioService } = require("../dist/modules/studio/studio.service");
const { visualEvidence } = require("../dist/modules/chat/visual-evidence");
const { checkFile } = require("../dist/modules/sources/upload-validation");
after(() => database.db.end());

async function harness(t) {
  const pg = new PGlite();
  await pg.exec(readFileSync("migrations/001_notebooks.sql", "utf8"));
  t.after(() => pg.close());
  t.mock.method(
    database,
    "rows",
    async (sql, args = []) => (await pg.query(sql, args)).rows,
  );
  t.mock.method(database, "transaction", (run) =>
    pg.transaction((tx) => run({ query: (sql, args) => tx.query(sql, args) })),
  );
  const actor = { id: randomUUID(), email: "fixture@example.test" };
  const notebookId = randomUUID();
  const sourceId = randomUUID();
  await pg.query(
    "INSERT INTO notebook_ai.notebooks(id,owner_id,title) VALUES($1,$2,'fixture')",
    [notebookId, actor.id],
  );
  const {
    rows: [source],
  } = await pg.query(
    "INSERT INTO notebook_ai.sources(id,notebook_id,document_id,version_id,revision,name,size_bytes,owner_email,status) VALUES($1,$2,$3,$4,$5,'fixture.png',20,$6,'INDEXING') RETURNING *",
    [
      sourceId,
      notebookId,
      randomUUID(),
      randomUUID(),
      "a".repeat(64),
      actor.email,
    ],
  );
  t.mock.method(documents, "authorizeSources", async (owner, sources) => {
    assert.equal(owner.id, actor.id);
    assert.equal(sources[0].id, source.id);
    return [];
  });
  const bytes = Buffer.from("generated-test-image");
  const image = {
    id: "b".repeat(64),
    hash: createHash("sha256").update(bytes).digest("hex"),
    page: 1,
    context: "Doanh thu năm 2026",
    dataUrl: `data:image/jpeg;base64,${bytes.toString("base64")}`,
  };
  return {
    pg,
    source,
    actor,
    image,
    extracted: {
      pages: [{ text: "Nội dung OCR", page: 1, imageId: image.id }],
      images: [image],
    },
  };
}

test("OCR extraction and completed Vision results survive retries, model changes invalidate only descriptions, deletion cascades", async (t) => {
  const h = await harness(t);
  const extract = t.mock.method(rag, "rag", async () => h.extracted);
  const describe = t.mock.method(
    vision,
    "describeImage",
    async () => "Doanh thu tăng từ 10 lên 20 triệu đồng.",
  );
  const first = await enrichVisualSource(h.source, h.actor, "encoded-source");
  const again = await enrichVisualSource(h.source, h.actor, "encoded-source");
  assert.deepEqual(first, again);
  assert.equal(extract.mock.calls.length, 1);
  assert.equal(describe.mock.calls.length, 1);
  const oldModel = config.LLM_MODEL;
  config.LLM_MODEL = "changed-model";
  try {
    await enrichVisualSource(h.source, h.actor, "encoded-source");
  } finally {
    config.LLM_MODEL = oldModel;
  }
  assert.equal(extract.mock.calls.length, 1);
  assert.equal(describe.mock.calls.length, 2);
  const stored = await h.pg.query(
    "SELECT payload FROM notebook_ai.source_extractions",
  );
  assert.ok(
    !JSON.stringify(stored.rows).includes("data:image"),
    "image bytes are stored only once",
  );
  await h.pg.query("DELETE FROM notebook_ai.sources WHERE id=$1", [
    h.source.id,
  ]);
  assert.equal(
    (await h.pg.query("SELECT * FROM notebook_ai.source_visuals")).rows.length,
    0,
  );
  assert.equal(
    (await h.pg.query("SELECT * FROM notebook_ai.source_extractions")).rows
      .length,
    0,
  );
});

test("revoked sources never reach extraction or the external Vision provider", async (t) => {
  const h = await harness(t);
  const extract = t.mock.method(rag, "rag", async () => h.extracted);
  const describe = t.mock.method(
    vision,
    "describeImage",
    async () => "must not run",
  );
  t.mock.method(documents, "authorizeSources", async () => {
    throw new Error("permission revoked");
  });
  await assert.rejects(
    enrichVisualSource(h.source, h.actor, "encoded-source"),
    /permission revoked/,
  );
  assert.equal(extract.mock.calls.length, 0);
  assert.equal(describe.mock.calls.length, 0);
});

test("reindexing with visual content invalidates the old text-only summary cache", async (t) => {
  const h = await harness(t);
  await h.pg.query(
    "UPDATE notebook_ai.sources SET status='READY' WHERE id=$1",
    [h.source.id],
  );
  const studio = new StudioService(new SourcesService());
  const original = await studio.artifact(
    h.actor,
    h.source.notebook_id,
    "SUMMARY",
    [h.source.id],
  );
  const reused = await studio.artifact(
    h.actor,
    h.source.notebook_id,
    "SUMMARY",
    [h.source.id],
  );
  assert.equal(reused.id, original.id);
  await h.pg.query(
    "UPDATE notebook_ai.sources SET index_version='visual-v1' WHERE id=$1",
    [h.source.id],
  );
  const visual = await studio.artifact(
    h.actor,
    h.source.notebook_id,
    "SUMMARY",
    [h.source.id],
  );
  assert.notEqual(visual.id, original.id);
});

test("a partial Vision failure checkpoints extraction and successful images for the next attempt", async (t) => {
  const h = await harness(t);
  const second = {
    ...h.image,
    id: "c".repeat(64),
    context: "Trang tiếp theo",
    page: 2,
  };
  const extract = t.mock.method(rag, "rag", async () => ({
    ...h.extracted,
    images: [h.image, second],
  }));
  let calls = 0;
  t.mock.method(vision, "describeImage", async () => {
    if (++calls === 2) throw new Error("fixture provider failure");
    return "Mô tả hoàn tất";
  });
  await assert.rejects(
    enrichVisualSource(h.source, h.actor, "encoded-source"),
    /fixture provider failure/,
  );
  await enrichVisualSource(h.source, h.actor, "encoded-source");
  assert.equal(extract.mock.calls.length, 1);
  assert.equal(calls, 3, "only the failed image is retried");
});

test("image previews require notebook ownership, ready status and current document permission", async (t) => {
  const h = await harness(t);
  t.mock.method(rag, "rag", async () => h.extracted);
  t.mock.method(vision, "describeImage", async () => "Mô tả hình");
  await enrichVisualSource(h.source, h.actor, "encoded-source");
  const service = new SourcesService();
  await assert.rejects(
    service.visual(h.actor, h.source.notebook_id, h.source.id, h.image.id),
  );
  await h.pg.query(
    "UPDATE notebook_ai.sources SET status='READY' WHERE id=$1",
    [h.source.id],
  );
  assert.equal(
    (
      await service.visual(
        h.actor,
        h.source.notebook_id,
        h.source.id,
        h.image.id,
      )
    ).dataUrl,
    h.image.dataUrl,
  );
  await assert.rejects(
    service.visual(
      { ...h.actor, id: randomUUID() },
      h.source.notebook_id,
      h.source.id,
      h.image.id,
    ),
  );
  t.mock.method(documents, "authorizeSources", async () => {
    throw new Error("revoked");
  });
  await assert.rejects(
    service.visual(h.actor, h.source.notebook_id, h.source.id, h.image.id),
    /revoked/,
  );
});

test("visual follow-ups send only distinct images from selected current sources; normal questions send none", async (t) => {
  const h = await harness(t);
  t.mock.method(rag, "rag", async () => h.extracted);
  t.mock.method(vision, "describeImage", async () => "Mô tả hình");
  await enrichVisualSource(h.source, h.actor, "encoded-source");
  const source = { ...h.source, status: "READY" };
  const citation = { label: "S1", sourceId: source.id, imageId: h.image.id };
  assert.deepEqual(
    await visualEvidence(
      "giải thích biểu đồ",
      [citation, { ...citation, label: "S2" }],
      [source],
    ),
    [{ label: "S1", dataUrl: h.image.dataUrl }],
  );
  assert.deepEqual(
    await visualEvidence("tóm tắt tài liệu", [citation], [source]),
    [],
  );
  assert.deepEqual(await visualEvidence("đọc hình", [citation], []), []);
  assert.deepEqual(
    await visualEvidence(
      "đọc hình",
      [citation],
      [{ ...source, revision: "new" }],
    ),
    [],
  );
});

test("Vision uses bounded image blocks, counts image tokens and rejects truncated responses", async (t) => {
  const admits = [];
  t.mock.method(llm, "admitModel", async (tokens) => admits.push(tokens));
  t.mock.method(global, "fetch", async (url, options) => {
    assert.equal(url, "https://vibi.top/v1/chat/completions");
    assert.equal(options.redirect, "error");
    const body = JSON.parse(options.body);
    assert.equal(body.messages[1].content[1].type, "image_url");
    assert.equal(body.max_tokens, config.VISION_MAX_TOKENS);
    return Response.json({
      choices: [
        { finish_reason: "length", message: { content: "incomplete" } },
      ],
    });
  });
  await assert.rejects(
    vision.describeImage(
      "https://unapproved.invalid/image.jpg",
      "",
      new AbortController().signal,
    ),
    /không hợp lệ/,
  );
  await assert.rejects(
    vision.describeImage(
      "data:image/jpeg;base64,YQ==",
      "fixture",
      new AbortController().signal,
    ),
    /VISION_INCOMPLETE/,
  );
  assert.equal(admits.length, 1);
  assert.ok(admits[0] >= 1024 + config.VISION_MAX_TOKENS);
  for (const name of ["image.png", "image.JPG", "image.webp"])
    assert.doesNotThrow(() => checkFile(name, 100));
});

test("image batching preserves first-two order across missing, duplicate and stale candidates", async (t) => {
  const h = await harness(t);
  const secondId = "c".repeat(64),
    thirdId = "d".repeat(64);
  for (const [id, data] of [
    [h.image.id, h.image.dataUrl],
    [secondId, "data:image/png;base64,second"],
    [thirdId, "data:image/png;base64,third"],
  ])
    await h.pg.query(
      "INSERT INTO notebook_ai.source_visuals(source_id,revision,image_id,image_hash,data_url) VALUES($1,$2,$3,$3,$4)",
      [h.source.id, h.source.revision, id, data],
    );
  let lookups = 0;
  t.mock.method(database, "rows", async (sql, args = []) => {
    if (sql.includes("source_visuals")) lookups++;
    return (await h.pg.query(sql, args)).rows;
  });
  const source = { ...h.source, status: "READY" };
  const evidence = [
    ...Array.from({ length: 20 }, (_, i) => ({
      sourceId: source.id,
      label: "M" + i,
      imageId: String(i).padStart(64, "0"),
    })),
    { sourceId: randomUUID(), label: "FOREIGN", imageId: h.image.id },
    { sourceId: source.id, label: "S1", imageId: h.image.id },
    { sourceId: source.id, label: "DUPLICATE", imageId: h.image.id },
    { sourceId: source.id, label: "S2", imageId: secondId },
    { sourceId: source.id, label: "S3", imageId: thirdId },
  ];
  assert.deepEqual(await visualEvidence("read image", evidence, [source]), [
    { label: "S1", dataUrl: h.image.dataUrl },
    { label: "S2", dataUrl: "data:image/png;base64,second" },
  ]);
  assert.equal(lookups, 1);
  assert.deepEqual(
    await visualEvidence("read image", evidence, [
      { ...source, revision: "changed" },
    ]),
    [],
  );
  assert.deepEqual(
    await visualEvidence("read image", evidence, [
      { ...source, status: "FAILED" },
    ]),
    [],
  );
});
