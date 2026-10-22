import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../features/ai/upload.ts", import.meta.url),
  "utf8",
);
const exports = {};
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  { exports, crypto: globalThis.crypto },
);
const {
  validateUploadBatch,
  uploadNotebookFiles,
  uploadWithUniqueName,
  notebookUploadFolder,
} = exports;
const MiB = 1024 * 1024;
const file = (name = "valid.pdf", size = 100) => ({ name, size });

test("accepts static PNG, JPEG and WebP sources with the same notebook limits", () => {
  const batch = validateUploadBatch(
    [file("scan.png"), file("chart.JPG"), file("diagram.webp")],
    [],
  );
  assert.equal(batch.count, 3);
  assert.equal(batch.bytes, 300);
  assert.throws(() => validateUploadBatch([file("animated.gif")], []));
});

test("notebooks store same-named files in separate folders and reuse their own folder", async () => {
  const folders = new Map();
  const documents = {
    async getNameConflict({ name }) {
      return { exists: folders.has(name), item: folders.get(name) ?? null };
    },
    async createFolder({ name }) {
      assert.ok(!folders.has(name));
      const item = { id: `folder-${folders.size}`, type: "FOLDER" };
      folders.set(name, item);
      return item;
    },
  };
  const first = await notebookUploadFolder("notebook-a", documents);
  const second = await notebookUploadFolder("notebook-b", documents);
  assert.notEqual(first, second);
  assert.equal(await notebookUploadFolder("notebook-a", documents), first);
  const stored = new Set([`${first}/Mekongrealism.docx`]);
  const save = (folder) => async (name) => {
    if (stored.has(`${folder}/${name}`))
      throw {
        response: { status: 409, data: { code: "DOCUMENT_NAME_CONFLICT" } },
      };
    stored.add(`${folder}/${name}`);
    return name;
  };
  assert.equal(
    await uploadWithUniqueName("Mekongrealism.docx", save(second)),
    "Mekongrealism.docx",
  );
  assert.match(
    await uploadWithUniqueName("Mekongrealism.docx", save(first)),
    /^Mekongrealism \([a-f0-9-]+\)\.docx$/,
  );
});

test("concurrent folder creation recovers from conflict, but never masks permission errors", async () => {
  let checks = 0;
  const documents = {
    async getNameConflict() {
      checks++;
      return {
        exists: checks > 1,
        item: checks > 1 ? { id: "concurrent", type: "FOLDER" } : null,
      };
    },
    async createFolder() {
      throw { response: { status: 409 } };
    },
  };
  assert.equal(await notebookUploadFolder("a", documents), "concurrent");
  const denied = { response: { status: 403 } };
  checks = 0;
  await assert.rejects(
    notebookUploadFolder("a", {
      ...documents,
      async createFolder() {
        throw denied;
      },
    }),
    (error) => error === denied,
  );
  await assert.rejects(
    notebookUploadFolder("a", {
      ...documents,
      async getNameConflict() {
        return { exists: true, item: { id: "file", type: "FILE" } };
      },
    }),
    /đổi tên file/,
  );
});

test("conflict retries are bounded, preserve extension and do not retry other errors", async () => {
  assert.equal(
    await uploadWithUniqueName("fresh.md", async (name) => name),
    "fresh.md",
  );
  const longName = "a".repeat(295) + ".docx";
  let calls = 0;
  const result = await uploadWithUniqueName(longName, async (name) => {
    calls++;
    if (calls === 1)
      throw {
        response: { status: 409, data: { code: "DOCUMENT_NAME_CONFLICT" } },
      };
    return name;
  });
  assert.equal(calls, 2);
  assert.equal(result.length, 300);
  assert.ok(result.endsWith(").docx"));
  calls = 0;
  await assert.rejects(
    uploadWithUniqueName("busy.txt", async () => {
      calls++;
      throw {
        response: { status: 409, data: { code: "DOCUMENT_NAME_CONFLICT" } },
      };
    }),
  );
  assert.equal(calls, 3);
  for (const status of [403, 409, 500, undefined]) {
    calls = 0;
    const cause = { response: { status } };
    await assert.rejects(
      uploadWithUniqueName("file.txt", async () => {
        calls++;
        throw cause;
      }),
      (error) => error === cause,
    );
    assert.equal(calls, 1);
  }
});

test("rejects empty/oversized/unsupported files and total capacity before any request", async () => {
  for (const [files, sources] of [
    [[file("empty.md", 0)], []],
    [[file("large.pdf", 20 * MiB + 1)], []],
    [[file("bad.exe")], []],
    [Array.from({ length: 6 }, () => file()), []],
    [[file("a.pdf", 20 * MiB)], [{ size_bytes: 31 * MiB }]],
    [[file()], Array.from({ length: 5 }, () => ({ size_bytes: 1 }))],
  ]) {
    let calls = 0;
    const no = async () => {
      calls++;
    };
    await assert.rejects(
      uploadNotebookFiles(files, sources, {
        check: no,
        upload: no,
        add: no,
        stage() {},
      }),
    );
    assert.equal(calls, 0);
  }
  assert.equal(
    validateUploadBatch(
      [file("BOUNDARY.PDF", 20 * MiB)],
      [{ size_bytes: 30 * MiB }],
    ).bytes,
    20 * MiB,
  );
});

test("a bad second file prevents all persistent uploads and source creation", async () => {
  const calls = [];
  await assert.rejects(
    uploadNotebookFiles([file("ok.pdf"), file("scan.pdf")], [], {
      check: async (f) => {
        calls.push(`check:${f.name}`);
        if (f.name === "scan.pdf")
          throw { response: { data: { message: "PDF cần OCR" } } };
      },
      upload: async () => {
        calls.push("upload");
        return { id: "doc" };
      },
      add: async () => {
        calls.push("add");
      },
      stage() {},
    }),
    /scan.pdf: PDF cần OCR/,
  );
  assert.deepEqual(calls, ["check:ok.pdf", "check:scan.pdf"]);
});

test("all preflight checks precede all uploads, followed by one batch add", async () => {
  const calls = [];
  const stages = [];
  await uploadNotebookFiles([file("a.txt"), file("b.md")], [], {
    check: async (f, batch) => {
      assert.equal(batch.count, 2);
      assert.equal(batch.bytes, 200);
      calls.push(`check:${f.name}`);
    },
    upload: async (f) => {
      calls.push(`upload:${f.name}`);
      return { id: f.name };
    },
    add: async (ids) => {
      calls.push(`add:${ids.join(",")}`);
    },
    stage: (stage) => stages.push(stage),
  });
  assert.deepEqual(calls, [
    "check:a.txt",
    "check:b.md",
    "upload:a.txt",
    "upload:b.md",
    "add:a.txt,b.md",
  ]);
  assert.deepEqual(stages, ["CHECKING", "UPLOADING", "ADDING"]);
});

test("failure after persistent upload preserves files and gives recovery guidance", async () => {
  await assert.rejects(
    uploadNotebookFiles([file()], [], {
      check: async () => {},
      upload: async () => ({ id: "saved" }),
      add: async () => {
        throw { response: { data: { message: "Notebook đầy" } } };
      },
      stage() {},
    }),
    /Notebook đầy.*Chọn từ Tài liệu/,
  );
});
