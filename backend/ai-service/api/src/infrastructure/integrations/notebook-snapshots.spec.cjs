/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test loader. */
/* global require, __dirname, Response */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../.."));
const source = (id) => ({
  id,
  notebook_id: "notebook",
  document_id: `origin-${id}`,
  version_id: `version-${id}`,
  snapshot_id: `snapshot-${id}`,
  revision: "immutable",
  name: "file.txt",
  size_bytes: 10,
  status: "READY",
  progress: 100,
  chunk_count: 1,
  error: null,
});
function client(post) {
  return load("infrastructure/integrations/document.client.ts", {
    "../../config/env.config": {
      config: {
        DOCUMENT_SERVICE_URL: "http://document.invalid",
        AI_DOCUMENT_SERVICE_KEY: "fixture",
      },
    },
    "./internal-http": {
      serviceUrl: (base, suffix) => base + suffix,
      internalPost: post,
    },
  });
}
test("private Notebook copies authorize in one batch without resolving original Documents", async () => {
  const selected = [source("one"), source("two")],
    calls = [];
  const { authorizeSources } = client(async (url, options) => {
    calls.push({ url, body: options.body });
    return Response.json({
      data: selected.map((item) => ({
        documentId: item.document_id,
        versionId: item.version_id,
        revision: item.revision,
        sizeBytes: 10,
        name: item.name,
        current: true,
        snapshotId: item.snapshot_id,
      })),
    });
  });
  assert.equal(
    (
      await authorizeSources(
        { id: "owner", email: "owner@example.invalid" },
        selected,
      )
    ).length,
    2,
  );
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith("/internal/notebook-snapshots/resolve"));
  assert.deepEqual(calls[0].body.ids, ["snapshot-one", "snapshot-two"]);
});
test("snapshot rejection never falls back to an original file or another owner", async () => {
  let calls = 0;
  const { authorizeSources } = client(async () => {
    calls++;
    return new Response(null, { status: 403 });
  });
  await assert.rejects(
    authorizeSources({ id: "other-owner", email: "other@example.invalid" }, [
      source("one"),
    ]),
    /cannot be copied/,
  );
  assert.equal(calls, 1);
});
