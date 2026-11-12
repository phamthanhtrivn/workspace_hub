import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire, Module } from "node:module";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tooling = createRequire(
  new URL("../communication-service/package.json", import.meta.url),
);
tooling("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    moduleResolution: "Node",
    target: "ES2023",
    esModuleInterop: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
  },
});
const require = createRequire(
  new URL("../ai-service/api/package.json", import.meta.url),
);
function stub(file, exports) {
  const id = require.resolve(file),
    entry = new Module(id);
  entry.filename = id;
  entry.loaded = true;
  entry.exports = exports;
  require.cache[id] = entry;
}
stub("./src/config/env.config.ts", {
  config: {
    VISUAL_ENABLED: "false",
    MEETING_STT_URL: "https://speech.invalid",
    MEETING_STT_TIMEOUT_MS: 5000,
  },
});
let database,
  query,
  resolve,
  downloads = 0,
  validations = 0;
stub("./src/infrastructure/database/database.ts", {
  rows: (...args) => database(...args),
  transaction: (run) => run({ query: (...args) => query(...args) }),
});
stub("./src/infrastructure/queue/notebook.queue.ts", {
  enqueue: async () => {},
});
stub("./src/common/auth/notebook-access.ts", {
  ownedNotebook: async () => ({ id: "notebook" }),
});
stub("./src/infrastructure/integrations/document.client.ts", {
  resolveDocuments: (...args) => resolve(...args),
});
const upload = require("./src/modules/sources/upload-validation.ts");
stub("./src/modules/sources/upload-validation.ts", {
  ...upload,
  downloadSource: async () => {
    downloads++;
    return Buffer.from("test");
  },
  validateContent: async () => {
    validations++;
  },
});
for (const [file, name] of [
  ["work-store", "WorkStore"],
  ["work-assistant-access.service", "WorkAssistantAccessService"],
  ["work-assistant-generation.service", "WorkAssistantGenerationService"],
])
  stub(`./src/modules/work-assistant/${file}.ts`, { [name]: class {} });

const { SourcesService } = require("./src/modules/sources/sources.service.ts");
const {
  WorkAssistantWorkflowService,
} = require("./src/modules/work-assistant/work-assistant-workflow.service.ts");
const { readResponseText } = require("./src/common/read-response.ts");
const {
  recognizeMeetingChunk,
} = require("./src/modules/meeting-summary/speech.client.ts");
const { ForbiddenException } = require("@nestjs/common");
const actor = { id: "actor", email: "test@example.invalid" };
const manifest = {
  documentId: "doc",
  versionId: "v1",
  revision: "r1",
  name: "test.txt",
  sizeBytes: 4,
  current: true,
};
const source = {
  id: "source",
  notebook_id: "notebook",
  document_id: "doc",
  version_id: "v1",
  revision: "r1",
  name: "test.txt",
  size_bytes: 4,
  status: "READY",
};

function sourceState({
  existing = [source],
  locked = existing,
  manifests = [manifest],
} = {}) {
  downloads = validations = 0;
  const inserted = [];
  database = async () => existing;
  resolve = async () => manifests;
  query = async (sql, args) => {
    if (sql.startsWith("SELECT id")) return { rows: [{ id: "notebook" }] };
    if (sql.startsWith("SELECT *")) return { rows: locked };
    inserted.push(args);
    return { rows: [{ ...source, document_id: args[2], version_id: args[3] }] };
  };
  return inserted;
}

test("adding an existing source rechecks access but does not download or validate bytes again", async () => {
  sourceState();
  let authorized = 0;
  resolve = async () => {
    authorized++;
    return [manifest];
  };
  const result = await new SourcesService().add(actor, "notebook", [
    { documentId: "doc" },
  ]);
  assert.equal(authorized, 1);
  assert.equal(result.length, 1);
  assert.equal(downloads, 0);
  assert.equal(validations, 0);
});

test("duplicate references to a new source are downloaded, validated and inserted once", async () => {
  const inserted = sourceState({
    existing: [],
    manifests: [manifest, manifest],
  });
  const result = await new SourcesService().add(actor, "notebook", [
    { documentId: "doc" },
    { documentId: "doc", versionId: "v1" },
  ]);
  assert.equal(downloads, 1);
  assert.equal(validations, 1);
  assert.equal(inserted.length, 1);
  assert.equal(result.length, 1);
});

test("existing sources cannot bypass revoked permissions or changed revisions", async () => {
  const inserted = sourceState();
  resolve = async () => {
    throw new ForbiddenException();
  };
  await assert.rejects(
    new SourcesService().add(actor, "notebook", [{ documentId: "doc" }]),
    ForbiddenException,
  );
  sourceState({ manifests: [{ ...manifest, revision: "changed" }] });
  await assert.rejects(
    new SourcesService().add(actor, "notebook", [{ documentId: "doc" }]),
    /đã thay đổi/,
  );
  assert.equal(downloads, 0);
  assert.equal(inserted.length, 0);
});

test("capacity and source revisions are rechecked under the notebook lock", async () => {
  const full = Array.from({ length: 5 }, (_, i) => ({
    ...source,
    id: `other-${i}`,
    document_id: `other-${i}`,
  }));
  const inserted = sourceState({ existing: [], locked: full });
  await assert.rejects(
    new SourcesService().add(actor, "notebook", [{ documentId: "doc" }]),
    /tối đa 5 file/,
  );
  assert.equal(inserted.length, 0);
  sourceState({ locked: [{ ...source, revision: "changed" }] });
  await assert.rejects(
    new SourcesService().add(actor, "notebook", [{ documentId: "doc" }]),
    /đã thay đổi/,
  );
});

async function waitingWork(t, canceled) {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let started, close;
  const ready = new Promise((done) => {
    started = done;
  });
  const failures = [],
    events = [];
  const stream = {
    destroyed: false,
    start() {},
    end() {},
    heartbeat() {},
    onClose(fn) {
      close = fn;
      return () => {};
    },
    emit(name, data) {
      events.push({ name, data });
    },
  };
  const workflow = new WorkAssistantWorkflowService(
    { create: () => stream },
    {
      begin: async () => {},
      canceled,
      fail: async (_actor, _id, value) => {
        failures.push(value);
      },
    },
    {
      generateAnswer: ({ signal }) =>
        new Promise((_done, fail) => {
          signal.addEventListener("abort", () => fail(signal.reason), {
            once: true,
          });
          started(signal);
        }),
    },
    { owned: async () => ({ id: "session" }) },
  );
  const running = workflow.message(
    actor,
    "session",
    { requestId: "request" },
    {},
  );
  await ready;
  return { running, failures, events, close: () => close() };
}

test("a work cancellation-poll database failure stays FAILED rather than CANCELED", async (t) => {
  const run = await waitingWork(t, async () => {
    throw new Error("database unavailable");
  });
  t.mock.timers.tick(1000);
  await run.running;
  assert.deepEqual(run.failures, [false]);
  assert.match(
    run.events.find((e) => e.name === "error").data.message,
    /Chưa thể trả lời/,
  );
});

test("work access denial preserves its 403 cause after aborting", async (t) => {
  const run = await waitingWork(t, async () => {
    throw new ForbiddenException();
  });
  t.mock.timers.tick(1000);
  await run.running;
  assert.deepEqual(run.failures, [false]);
  const error = run.events.find((e) => e.name === "error").data;
  assert.equal(error.status, 403);
  assert.match(error.message, /Quyền truy cập/);
});

test("explicit cancellation and disconnect still cancel work requests", async (t) => {
  const run = await waitingWork(t, async () => true);
  t.mock.timers.tick(1000);
  await run.running;
  assert.deepEqual(run.failures, [true]);
  assert.equal(
    run.events.find((e) => e.name === "error").data.message,
    "Yêu cầu đã dừng.",
  );
});

test("a disconnected work stream cancels its running request", async (t) => {
  const run = await waitingWork(t, async () => false);
  run.close();
  await run.running;
  assert.deepEqual(run.failures, [true]);
});

test("the work deadline reports timeout and records failure rather than cancellation", async (t) => {
  const timeout = new AbortController();
  t.mock.method(AbortSignal, "timeout", () => timeout.signal);
  const run = await waitingWork(t, async () => false);
  timeout.abort(new DOMException("deadline", "TimeoutError"));
  await run.running;
  assert.deepEqual(run.failures, [false]);
  assert.match(
    run.events.find((e) => e.name === "error").data.message,
    /Hết thời gian/,
  );
});

test("work admission errors propagate instead of being swallowed during cleanup", async () => {
  const workflow = new WorkAssistantWorkflowService(
    { create: () => ({ destroyed: false, onClose: () => () => {} }) },
    {
      begin: async () => {
        throw new Error("admission failed");
      },
    },
    {},
    { owned: async () => ({ id: "session" }) },
  );
  await assert.rejects(
    workflow.message(actor, "session", { requestId: "request" }, {}),
    /admission failed/,
  );
});

test("bounded response reading preserves split UTF-8 and releases the stream", async () => {
  const bytes = new TextEncoder().encode("Tiếng Việt");
  const response = new Response(
    new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    }),
  );
  assert.equal(await readResponseText(response, 100), "Tiếng Việt");
  assert.equal(response.body.locked, false);
});

test("bounded response reading cancels oversized bodies and releases failed readers", async () => {
  for (const declared of [false, true]) {
    let canceled = 0;
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(20));
        },
        cancel() {
          canceled++;
        },
      }),
      { headers: declared ? { "content-length": "20" } : {} },
    );
    await assert.rejects(readResponseText(response, 10));
    assert.equal(canceled, 1);
    assert.equal(response.body.locked, false);
  }
  const response = new Response(
    new ReadableStream({
      pull(controller) {
        controller.error(new Error("stream failed"));
      },
    }),
  );
  await assert.rejects(readResponseText(response, 100), /stream failed/);
  assert.equal(response.body.locked, false);
});

test("speech uses the bounded reader and keeps validation and HTTP error behavior", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "ai-speech-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "chunk.wav");
  await writeFile(file, Buffer.from("synthetic audio"));
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify({ text: "  Xin chào  " })),
  );
  const signal = new AbortController().signal;
  assert.equal(await recognizeMeetingChunk(file, signal, "auto"), "Xin chào");
  globalThis.fetch = async () => new Response("busy", { status: 429 });
  await assert.rejects(
    recognizeMeetingChunk(file, signal),
    (error) => error.status === 429,
  );
  globalThis.fetch = async () => new Response("x".repeat(65537));
  await assert.rejects(
    recognizeMeetingChunk(file, signal),
    (error) => error.message === "Local speech response exceeds limit" && !("status" in error),
  );
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ text: "x", unexpected: true }));
  await assert.rejects(recognizeMeetingChunk(file, signal));
});
