const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");
const { ForbiddenException } = require("@nestjs/common");

Object.assign(process.env, {
  AI_ENABLED: "true",
  INTERNAL_SERVICE_KEY: "test-internal-only-not-production-000",
  AI_GATEWAY_KEY: "fixture-gateway-proof-not-production-000",
  AI_DOCUMENT_SERVICE_KEY: "fixture-ai-document-not-production-000",
  RAG_SERVICE_KEY: "fixture-rag-service-not-production-000",
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "test-only",
  LLM_MODEL: "fixture-model",
  LLM_REQUESTS_PER_MINUTE: "100",
});
const jobs = [];
require.cache[require.resolve("../dist/queue")] = {
  exports: { enqueue: async (...args) => jobs.push(args) },
};
const database = require("../dist/db");
const documents = require("../dist/documents");
const { Notebooks } = require("../dist/notebooks");
const { modelAnswer } = require("../dist/model");
const { Chat } = require("../dist/chat");
const { EventEmitter } = require("node:events");
class Output extends EventEmitter {
  text = "";
  destroyed = false;
  status() {
    return this;
  }
  set() {
    return this;
  }
  flushHeaders() {}
  write(value) {
    this.text += value;
  }
  end() {}
}

test("PostgreSQL migration, notebook ownership, masking, cache and provider contracts", async (t) => {
  const pg = new PGlite();
  t.after(async () => {
    await pg.close();
    await database.db.end();
  });
  const migration = readFileSync("migrations/001_notebooks.sql", "utf8");
  await pg.exec(migration);
  await pg.exec(migration); // Repeatable, additive, no legacy tables dropped.
  database.rows = async (sql, values = []) =>
    (await pg.query(sql, values)).rows;
  database.transaction = async (run) =>
    pg.transaction((tx) =>
      run({ query: (sql, values = []) => tx.query(sql, values) }),
    );
  const actor = { id: randomUUID(), email: "owner@example.test" };
  const other = { id: randomUUID(), email: "other@example.test" };
  const notebooks = new Notebooks();
  const notebook = await notebooks.create(actor, "Vietnamese research");
  let revoked = false;
  const doc = {
    documentId: randomUUID(),
    versionId: randomUUID(),
    revision: "r1",
    name: "source.md",
    sizeBytes: 123,
    current: true,
  };
  documents.resolveDocuments = async (_actor, refs) =>
    refs.map((ref) => ({ ...doc, documentId: ref.documentId }));
  documents.authorizeSources = async () => {
    if (revoked) throw new ForbiddenException();
    return [doc];
  };
  await t.test("IDs alone do not authorize another user", async () => {
    await assert.rejects(
      notebooks.get(other, notebook.id),
      (error) => error.getStatus() === 404,
    );
    assert.deepEqual(await notebooks.list(other), []);
  });
  const [source] = await notebooks.add(actor, notebook.id, [
    { documentId: doc.documentId },
  ]);
  await pg.query(
    "UPDATE notebook_ai.sources SET status='READY',chunk_count=1 WHERE id=$1",
    [source.id],
  );
  await t.test(
    "duplicate add does not duplicate source and notebook limits hold",
    async () => {
      await notebooks.add(actor, notebook.id, [{ documentId: doc.documentId }]);
      assert.equal((await notebooks.sources(notebook.id)).length, 1);
      await assert.rejects(
        notebooks.add(
          actor,
          notebook.id,
          Array.from({ length: 5 }, () => ({ documentId: randomUUID() })),
        ),
        (error) => error.getStatus() === 400,
      );
    },
  );
  const messageId = randomUUID();
  const snapshot = JSON.stringify([{ id: source.id, revision: "r1" }]);
  await pg.query(
    "INSERT INTO notebook_ai.messages(id,notebook_id,role,content,sources) VALUES($1,$2,'ASSISTANT','private-derived-text',$3)",
    [messageId, notebook.id, snapshot],
  );
  const saved = await notebooks.note(actor, notebook.id, {
    title: "Saved",
    messageId,
  });
  await notebooks.note(actor, notebook.id, {
    title: "Manual",
    content: "my text",
  });
  await t.test(
    "cache reuses same revision and masks after revocation",
    async () => {
      const first = await notebooks.artifact(actor, notebook.id, "SUMMARY");
      assert.equal(
        (await notebooks.artifact(actor, notebook.id, "SUMMARY")).id,
        first.id,
      );
      revoked = true;
      const state = await notebooks.get(actor, notebook.id);
      assert.equal(state.messages[0].hidden, true);
      assert.equal(state.messages[0].content, "");
      assert.equal(
        state.notes.find((note) => note.id === saved.id).hidden,
        true,
      );
      assert.equal(
        state.notes.find((note) => note.title === "Manual").content,
        "my text",
      );
      assert.equal(state.artifacts[0].hidden, true);
      await assert.rejects(
        notebooks.note(actor, notebook.id, { title: "Copied", messageId }),
      );
      revoked = false;
    },
  );
  await t.test(
    "streaming accepts stop, rejects truncation and missing terminal event without replay",
    async () => {
      const originalFetch = global.fetch;
      t.after(() => {
        global.fetch = originalFetch;
      });
      let calls = 0;
      const evidence = [{ label: "S1", name: "source.md", text: "text" }];
      const run = async (finish) => {
        global.fetch = async () => {
          calls++;
          return new Response(
            `data: ${JSON.stringify({ choices: [{ delta: { content: "Supported [[S1]]" }, finish_reason: null }] })}\n\n${finish}`,
            { headers: { "content-type": "text/event-stream" } },
          );
        };
        let text = "";
        for await (const chunk of modelAnswer(
          "question",
          evidence,
          new AbortController().signal,
        ))
          text += chunk;
        return text;
      };
      assert.equal(
        await run(
          'data: {"choices":[{"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        ),
        "Supported [[S1]]",
      );
      await assert.rejects(
        run('data: {"choices":[{"finish_reason":"length"}]}\n\n'),
      );
      await assert.rejects(run(""));
      assert.equal(calls, 3);
    },
  );
  await t.test(
    "chat finalization, duplicate IDs and cancellation release the notebook slot",
    async () => {
      const rag = require("../dist/rag");
      const models = require("../dist/model");
      const originalModel = models.modelAnswer;
      const originalRetrieve = rag.retrieve;
      t.after(() => {
        models.modelAnswer = originalModel;
        rag.retrieve = originalRetrieve;
      });
      rag.retrieve = async () => ({
        evidence: [
          { id: "chunk", sourceId: source.id, text: "evidence", position: 0 },
        ],
      });
      models.modelAnswer = async function* () {
        yield "Answer [[S1]]";
      };
      const chat = new Chat(notebooks);
      const requestId = randomUUID();
      const complete = new Output();
      await chat.answer(
        actor,
        notebook.id,
        "question",
        [source.id],
        requestId,
        complete,
      );
      assert.match(complete.text, /event: done/);
      await assert.rejects(
        chat.answer(
          actor,
          notebook.id,
          "duplicate",
          [source.id],
          requestId,
          new Output(),
        ),
        (e) => e.getStatus() === 409,
      );
      let entered;
      const generating = new Promise((resolve) => {
        entered = resolve;
      });
      models.modelAnswer = async function* (_question, _evidence, signal) {
        yield "partial";
        entered();
        await new Promise((_resolve, reject) => {
          if (signal.aborted) return reject(new Error("aborted"));
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        });
      };
      const cancelledId = randomUUID();
      const cancelled = new Output();
      const pending = chat.answer(
        actor,
        notebook.id,
        "cancel me",
        [source.id],
        cancelledId,
        cancelled,
      );
      await generating;
      const started = performance.now();
      await chat.cancel(actor, cancelledId);
      await pending;
      assert.ok(performance.now() - started < 2000);
      assert.doesNotMatch(cancelled.text, /event: done/);
      assert.equal(
        (
          await pg.query(
            "SELECT status FROM notebook_ai.requests WHERE id=$1",
            [cancelledId],
          )
        ).rows[0].status,
        "CANCELLED",
      );
      const newRequest = randomUUID();
      await pg.query(
        "INSERT INTO notebook_ai.requests(id,notebook_id,owner_id) VALUES($1,$2,$3)",
        [newRequest, notebook.id, actor.id],
      );
      await chat.cancel(actor, newRequest);
    },
  );
  await t.test(
    "one active answer per notebook and deletion keeps original file metadata outside AI",
    async () => {
      await pg.query(
        "INSERT INTO notebook_ai.requests(id,notebook_id,owner_id) VALUES($1,$2,$3)",
        [randomUUID(), notebook.id, actor.id],
      );
      await assert.rejects(
        pg.query(
          "INSERT INTO notebook_ai.requests(id,notebook_id,owner_id) VALUES($1,$2,$3)",
          [randomUUID(), notebook.id, actor.id],
        ),
      );
      await notebooks.remove(actor, notebook.id);
      assert.equal(
        (await pg.query("SELECT * FROM notebook_ai.messages")).rows.length,
        0,
      );
      assert.ok(jobs.some(([kind]) => kind === "cleanup"));
    },
  );
});
