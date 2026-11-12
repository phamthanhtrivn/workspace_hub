import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire, Module } from "node:module";
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
  config: { LLM_TIMEOUT_MS: 90000, CHAT_CANCEL_POLL_MS: 1000 },
});
let artifact,
  modelCalls = [],
  failSecond = false,
  authError;
const sources = ["one", "two"].map((id) => ({
  id,
  name: id + ".pdf",
  revision: "r1",
  status: "READY",
  chunk_count: 1,
}));
let workflowRows;
async function rows(sql, args) {
  if (workflowRows) return workflowRows(sql, args);
  if (sql.startsWith("SELECT a.*")) return [structuredClone(artifact)];
  if (sql.includes("SET status='RUNNING'")) artifact.status = "RUNNING";
  else if (sql.includes("SET in_flight=true")) artifact.in_flight = true;
  else if (sql.includes("SET in_flight=false")) artifact.in_flight = false;
  else if (sql.includes("SET sections=$2")) {
    artifact.sections = JSON.parse(args[1]);
    artifact.progress = args[2];
    artifact.in_flight = false;
  } else if (sql.includes("SET status='COMPLETED'")) {
    artifact.status = "COMPLETED";
    artifact.progress = 100;
    artifact.content = args[1];
    artifact.citations = JSON.parse(args[2]);
  } else if (sql.includes("SET status=$2")) {
    artifact.status = args[1];
    artifact.error = args[2];
  } else if (sql.includes("SET status='FAILED'")) artifact.status = "FAILED";
  else assert.fail("Unexpected summary SQL");
  return [];
}
stub("./src/infrastructure/database/database.ts", { rows });

stub("./src/modules/sources/sources.service.ts", {
  SourcesService: class {
    async sources() {
      return sources;
    }
  },
});
stub("./src/infrastructure/integrations/document.client.ts", {
  authorizeSources: async () => {
    if (authError) throw authError;
  },
});
stub("./src/infrastructure/integrations/rag.client.ts", {
  rag: async () => ({
    evidence: sources.map((s) => ({
      sourceId: s.id,
      text: "Synthetic source " + s.id,
      position: 0,
    })),
  }),
});
stub("./src/infrastructure/integrations/llm.client.ts", {
  modelAnswer: async function* (_question, evidence) {
    const source = evidence[0].sourceId;
    modelCalls.push(source);
    if (failSecond && source === "two")
      throw new TypeError("fetch failed", {
        cause: { code: "ETIMEDOUT", syscall: "connect" },
      });
    yield "Synthetic summary " + source + " [[" + evidence[0].label + "]]";
  },
});
stub("./src/common/abort-polling.ts", { pollUntilAborted: () => () => {} });
stub("./src/modules/chat/chat-generation.service.ts", {
  ChatGenerationService: class {},
});
stub("./src/modules/chat/chat-admission.service.ts", {
  ChatAdmissionService: class {},
});
stub("./src/modules/chat/chat-request.ts", {
  completeChatRequest: async () => "answer-id",
});
const { summarize } = require("./src/jobs/summary.processor.ts");
const {
  ChatWorkflowService,
} = require("./src/modules/chat/chat-workflow.service.ts");
const { ChatSseService } = require("./src/modules/chat/chat-sse.service.ts");

test("full-summary failure preserves checkpoints and explicit resume processes only remaining sources", async () => {
  artifact = {
    id: "artifact",
    notebook_id: "notebook",
    owner_id: "actor",
    owner_email: "test@example.invalid",
    sources: sources.map(({ id, revision }) => ({ id, revision })),
    kind: "SUMMARY",
    status: "QUEUED",
    in_flight: false,
    sections: [],
    progress: 0,
  };
  modelCalls = [];
  failSecond = true;
  await assert.rejects(summarize("artifact"));
  assert.equal(artifact.status, "FAILED");
  assert.equal(artifact.progress, 50);
  assert.equal(artifact.sections.length, 1);
  assert.match(artifact.error, /connect to the AI provider/);
  assert.deepEqual(modelCalls, ["one", "two"]);
  // These are the state changes made by the existing explicit Resume action.
  artifact.in_flight = false;
  artifact.status = "QUEUED";
  failSecond = false;
  await summarize("artifact");
  assert.equal(artifact.status, "COMPLETED");
  assert.equal(artifact.sections.length, 2);
  assert.equal(artifact.progress, 100);
  assert.deepEqual(modelCalls, ["one", "two", "two"]);
  assert.equal(artifact.citations.length, 2);
  assert.ok(artifact.content.includes("one.pdf"));
  assert.ok(artifact.content.includes("two.pdf"));
});

test("unknown previous summary outcomes are not replayed automatically", async () => {
  artifact.status = "QUEUED";
  artifact.in_flight = true;
  modelCalls = [];
  await assert.rejects(
    summarize("artifact"),
    /Previous provider outcome unknown/,
  );
  assert.equal(artifact.status, "FAILED");
  assert.deepEqual(modelCalls, []);
});

test("changed source snapshots fail before any model request", async () => {
  artifact.status = "QUEUED";
  artifact.in_flight = false;
  artifact.sources = [{ id: "one", revision: "old" }];
  modelCalls = [];
  await assert.rejects(summarize("artifact"), /Source snapshot unavailable/);
  assert.equal(artifact.status, "FAILED");
  assert.deepEqual(modelCalls, []);
});

function input(controller = new AbortController()) {
  const events = [];
  let ended = false;
  return {
    actor: { id: "actor", email: "test@example.invalid" },
    notebookId: "notebook",
    requestId: "request",
    question: "Guide me",
    sourceIds: ["one"],
    sources: [sources[0]],
    controller,
    stream: {
      start() {},
      emit(name, data) {
        events.push({ name, data });
      },
      end() {
        ended = true;
      },
    },
    events,
    get ended() {
      return ended;
    },
  };
}
test("a database failure while recording a provider error still reports the original cause to the client", async () => {
  const request = input();
  workflowRows = async () => {
    throw new Error("database unavailable");
  };
  const service = new ChatWorkflowService(
    { sources: async () => sources },
    {
      generateReply: async () => {
        throw new TypeError("fetch failed", {
          cause: { code: "ETIMEDOUT", syscall: "connect" },
        });
      },
    },
  );
  try {
    await service.streamAnswer(request);
  } finally {
    workflowRows = undefined;
  }
  assert.equal(request.ended, true);
  assert.match(
    request.events.find((e) => e.name === "error").data.message,
    /connect to the AI provider/,
  );
});
test("source verification failure is FAILED rather than a user cancellation", async () => {
  const controller = new AbortController(),
    request = input(controller),
    updates = [];
  const reason = new Error("Nguồn đã thay đổi");
  workflowRows = async (_sql, args) => {
    updates.push(args);
    return [];
  };
  const service = new ChatWorkflowService(
    { sources: async () => sources },
    {
      generateReply: async () => {
        controller.abort(reason);
        throw new DOMException("aborted", "AbortError");
      },
    },
  );
  try {
    await service.streamAnswer(request);
  } finally {
    workflowRows = undefined;
  }
  assert.equal(updates[0][1], "FAILED");
  assert.match(
    request.events.find((e) => e.name === "error").data.message,
    /version changed/,
  );
});
test("explicit user cancellation remains CANCELLED", async () => {
  const controller = new AbortController(),
    request = input(controller),
    updates = [];
  workflowRows = async (_sql, args) => {
    updates.push(args);
    return [];
  };
  const service = new ChatWorkflowService(
    { sources: async () => sources },
    {
      generateReply: async () => {
        controller.abort();
        controller.signal.throwIfAborted();
      },
    },
  );
  try {
    await service.streamAnswer(request);
  } finally {
    workflowRows = undefined;
  }
  assert.equal(updates[0][1], "CANCELLED");
});
test("heartbeat starts only after admission and is cleaned up after success or failure", async () => {
  const originalSet = globalThis.setInterval,
    originalClear = globalThis.clearInterval;
  let interval,
    cleared = 0,
    beats = 0,
    detach = 0,
    admitted = false;
  globalThis.setInterval = (fn, ms) => {
    assert.equal(admitted, true);
    assert.equal(ms, 15000);
    interval = fn;
    return 123;
  };
  globalThis.clearInterval = (id) => {
    assert.equal(id, 123);
    cleared++;
  };
  try {
    const sse = {
      create: () => ({
        destroyed: false,
        onClose: () => () => {
          detach++;
        },
        heartbeat: () => {
          beats++;
        },
      }),
    };
    const admission = {
      prepare: async () => {
        admitted = true;
        return sources;
      },
    };
    for (const fail of [false, true]) {
      const service = new ChatSseService(sse, admission, {
        streamAnswer: async () => {
          interval();
          if (fail) throw new Error("failure");
        },
      });
      if (fail)
        await assert.rejects(
          service.answer({}, "n", "q", [], "r", { destroyed: false }),
        );
      else await service.answer({}, "n", "q", [], "r", { destroyed: false });
    }
    assert.equal(beats, 2);
    assert.equal(cleared, 2);
    assert.equal(detach, 2);
  } finally {
    globalThis.setInterval = originalSet;
    globalThis.clearInterval = originalClear;
  }
});
