/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));
const { selectUploadFiles, validateUploadBatch } = require("../upload.ts");

test("partial file selection skips invalid files and keeps the original strict validator for Documents", () => {
  const good = { name: "note.txt", size: 10 };
  const selection = selectUploadFiles(
    [{ name: "bad.exe", size: 1 }, good, { name: "empty.pdf", size: 0 }],
    [],
  );
  assert.deepEqual(selection.accepted, [good]);
  assert.equal(selection.accepted[0], good);
  assert.deepEqual(
    selection.rejected.map((file) => file.name),
    ["bad.exe", "empty.pdf"],
  );
  assert.throws(() =>
    validateUploadBatch([{ name: "bad.exe", size: 1 }, good], []),
  );
});

test("partial selection respects remaining slots and bytes, including a smaller file after one that does not fit", () => {
  const mib = 1024 * 1024;
  const sources = [{ size_bytes: 20 * mib }, { size_bytes: 20 * mib }];
  const selection = selectUploadFiles(
    [
      { name: "large.pdf", size: 11 * mib },
      { name: "fits.pdf", size: 8 * mib },
      { name: "fits.txt", size: 2 * mib },
      { name: "overflow.txt", size: 1 },
    ],
    sources,
  );
  assert.deepEqual(
    selection.accepted.map((file) => file.name),
    ["fits.pdf", "fits.txt"],
  );
  assert.equal(selection.rejected.length, 2);
  const slots = selectUploadFiles(
    [
      { name: "first.txt", size: 1 },
      { name: "second.txt", size: 1 },
    ],
    Array.from({ length: 4 }, () => ({ size_bytes: 1 })),
  );
  assert.equal(slots.accepted.length, 1);
  assert.match(slots.rejected[0].message, /5 files/);
});

function fixture(context, beforeUpload = async () => {}) {
  let stateIndex = 0,
    refIndex = 0,
    refreshed = 0;
  const state = [],
    refs = [],
    uploaded = [],
    confirmed = [];
  const { useSourceUpload } = load("features/ai/hooks/use-source-upload.ts", {
    react: {
      ...React,
      useRef: (value) => (refs[refIndex++] ??= { current: value }),
      useState: (value) => {
        const key = stateIndex++;
        if (!(key in state)) state[key] = value;

        return [
          state[key],
          (update) => {
            state[key] =
              typeof update === "function" ? update(state[key]) : update;
          },
        ];
      },
    },
    "@/store/store": {
      store: { getState: () => ({ auth: { userId: "owner" } }) },
    },
    "../api/notebooks.api": {
      notebooksApi: {
        beginUpload: async (_id, file) => {
          uploaded.push(file.name);
          await beforeUpload();

          return {
            snapshotId: file.name,
            presignedUrl: "https://storage.invalid/upload",
          };
        },
        confirmUploads: async (_id, ids) => {
          confirmed.push(ids);
        },
      },
    },
  });
  context.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    status: 200,
  }));

  return {
    uploaded,
    confirmed,
    refreshed: () => refreshed,
    render() {
      stateIndex = 0;
      refIndex = 0;

      return useSourceUpload("book", [], async () => {
        refreshed++;
      });
    },
  };
}

test("a mixed upload sends only accepted files and preserves rejection feedback after success", async (context) => {
  const f = fixture(context);
  await f
    .render()
    .uploadFiles([new File(["ok"], "note.txt"), new File(["bad"], "bad.exe")]);
  assert.deepEqual(f.uploaded, ["note.txt"]);
  assert.deepEqual(f.confirmed, [["note.txt"]]);
  assert.equal(f.render().rejections[0].name, "bad.exe");
  assert.equal(f.render().error, "");
  assert.equal(f.refreshed(), 1);
});

test("all-invalid drops make no upload request; repeated drops share the active upload guard", async (context) => {
  let start, release;
  const started = new Promise((resolve) => {
    start = resolve;
  });
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  const f = fixture(context, async () => {
    start();
    await waiting;
  });
  await f.render().uploadFiles([new File(["bad"], "bad.exe")]);
  assert.equal(f.uploaded.length, 0);
  const first = f.render().uploadFiles([new File(["ok"], "note.txt")]);
  const duplicate = f.render().uploadFiles([new File(["ok"], "another.txt")]);
  await started;
  release();
  await Promise.all([first, duplicate]);
  assert.deepEqual(f.uploaded, ["note.txt"]);
});
