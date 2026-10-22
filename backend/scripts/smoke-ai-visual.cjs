// Run inside notebook-jobs with a generated {name,content} image fixture on stdin.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { join } = require("node:path");
const { rag } = require(
  join(process.cwd(), "dist/infrastructure/integrations/rag.client"),
);
const { describeImage } = require(
  join(process.cwd(), "dist/infrastructure/integrations/vision.client"),
);
const { db } = require(
  join(process.cwd(), "dist/infrastructure/database/database"),
);

async function run() {
  let input = "";
  for await (const part of process.stdin) input += part;
  const fixture = JSON.parse(input);
  assert.equal(fixture.name, "generated-visual-fixture.png");
  const scopeId = randomUUID(),
    sourceId = randomUUID();
  const source = { scopeId, name: fixture.name, content: fixture.content };
  try {
    const preflight = await rag(
      "/validate",
      source,
      AbortSignal.timeout(45000),
    );
    assert.equal(preflight.deferred, true);
    const extracted = await rag(
      "/extract",
      source,
      AbortSignal.timeout(210000),
    );
    assert.match(extracted.pages[0].text, /120/);
    assert.equal(extracted.images.length, 1);
    const image = extracted.images[0];
    const description = await describeImage(
      image.dataUrl,
      image.context,
      AbortSignal.timeout(90000),
    );
    assert.match(description, /120/);
    const indexed = await rag(
      "/index",
      {
        ...source,
        sourceId,
        revision: "a".repeat(64),
        pages: extracted.pages,
        visuals: [{ text: description, page: image.page, imageId: image.id }],
      },
      AbortSignal.timeout(240000),
    );
    assert.ok(indexed.chunkCount >= 2);
    const retrieved = await rag("/retrieve", {
      scopeId,
      sourceIds: [sourceId],
      question: "Doanh thu năm 2026 bao nhiêu?",
    });
    assert.ok(
      retrieved.evidence.some(
        (item) => item.imageId === image.id && /120/.test(item.text),
      ),
    );
    const isolated = await rag("/retrieve", {
      scopeId: randomUUID(),
      sourceIds: [sourceId],
      question: "Doanh thu",
    });
    assert.equal(isolated.evidence.length, 0);
    console.log(
      JSON.stringify({
        preflight: "passed",
        localOcr: "passed",
        vision: "passed",
        indexedChunks: indexed.chunkCount,
        retrievalAndImageCitation: "passed",
        scopeIsolation: "passed",
      }),
    );
  } finally {
    await rag("/delete", { scopeId, sourceId }).catch(() => {});
    await db.end();
  }
}
run().catch((error) => {
  console.error("Visual smoke failed:", error.message);
  process.exitCode = 1;
});
