const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");
const { ForbiddenException } = require("@nestjs/common");

Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env-file",
  VISUAL_ENABLED: "false",
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
  LLM_TOKENS_PER_MINUTE: "100000",
});
const jobs = [];
require.cache[require.resolve("../dist/infrastructure/queue/notebook.queue")] =
  {
    exports: { enqueue: async (...args) => jobs.push(args) },
  };
const database = require("../dist/infrastructure/database/database");
const documents = require("../dist/infrastructure/integrations/document.client");
const uploads = require("../dist/modules/sources/upload-validation");
const {
  NotebooksService,
} = require("../dist/modules/notebooks/notebooks.service");
const {
  modelAnswer,
} = require("../dist/infrastructure/integrations/llm.client");
const { SourcesService } = require("../dist/modules/sources/sources.service");
const { StudioService } = require("../dist/modules/studio/studio.service");
const { ChatService } = require("../dist/modules/chat/chat.service");
const { greetingReply } = require("../dist/modules/chat/chat-response");
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

test("only standalone greetings bypass document questions", () => {
  assert.match(greetingReply("  Hello!!!  "), /^Hello!/);
  assert.match(greetingReply("Xin chào…"), /^Chào bạn!/);
  for (const question of ["hello, summarize this document", "hi, what is Mekong realism?", "chào bạn, tóm tắt tài liệu", "hello world algorithm", "compare the sources"])
    assert.equal(greetingReply(question), null);
});

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
  const sourcesService = new SourcesService();
  const notebooks = new NotebooksService(sourcesService);
  const studio = new StudioService(sourcesService);
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
  const originalCheck = uploads.validateContent;
  const originalDownload = uploads.downloadSource;
  t.after(() => {
    uploads.validateContent = originalCheck;
    uploads.downloadSource = originalDownload;
  });
  uploads.validateContent = async () => ({ chunkCount: 1 });
  uploads.downloadSource = async () => Buffer.from("validated source");
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
  const [source] = await sourcesService.add(actor, notebook.id, [
    { documentId: doc.documentId },
  ]);
  await t.test(
    "invalid stored source is rejected before SQL creation or job enqueue, including retry",
    async () => {
      const before = jobs.length;
      uploads.validateContent = async () => {
        throw new (require("@nestjs/common").BadRequestException)(
          "PDF vượt 100 trang",
        );
      };
      await assert.rejects(
        sourcesService.add(actor, notebook.id, [{ documentId: randomUUID() }]),
        /100 trang/,
      );
      assert.equal((await sourcesService.sources(notebook.id)).length, 1);
      assert.equal(jobs.length, before);
      await assert.rejects(
        sourcesService.sourceAction(actor, notebook.id, source.id, "retry"),
        /100 trang/,
      );
      assert.equal(jobs.length, before);
      uploads.validateContent = async () => ({ chunkCount: 1 });
    },
  );
  await pg.query(
    "UPDATE notebook_ai.sources SET status='READY',chunk_count=1 WHERE id=$1",
    [source.id],
  );
  await t.test(
    "duplicate add does not duplicate source and notebook limits hold",
    async () => {
      await sourcesService.add(actor, notebook.id, [
        { documentId: doc.documentId },
      ]);
      assert.equal((await sourcesService.sources(notebook.id)).length, 1);
      await assert.rejects(
        sourcesService.add(
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
  const saved = await studio.note(actor, notebook.id, {
    title: "Saved",
    messageId,
  });
  await studio.note(actor, notebook.id, {
    title: "Manual",
    content: "my text",
  });
  await t.test(
    "cache reuses same revision and masks after revocation",
    async () => {
      const first = await studio.artifact(actor, notebook.id, "SUMMARY");
      assert.equal(
        (await studio.artifact(actor, notebook.id, "SUMMARY")).id,
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
        studio.note(actor, notebook.id, { title: "Copied", messageId }),
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
        global.fetch = async (_url, options) => {
          calls++;
          if (options) {
            const system = JSON.parse(options.body).messages[0].content;
            assert.match(system, /Respond only to the user's actual request/);
          }
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
      global.fetch = async () => new Response('data: {"choices":[{"delta":{"content":"last portion"},"finish_reason":"length"}]}\n\n');
      const received = [];
      await assert.rejects(async () => {
        for await (const delta of modelAnswer("question", evidence, new AbortController().signal)) received.push(delta);
      }, /bị cắt/);
      assert.deepEqual(received, ["last portion"]);
      global.fetch = async (_url, options) => {
        assert.match(JSON.parse(options.body).messages[0].content, /MUST ask exactly one short clarifying question/);
        const chunks = ["[[CLA", "RIFY]]", "Bạn muốn hỏi cụ thể điều gì?"];
        return new Response(chunks.map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`).join("") + 'data: {"choices":[{"finish_reason":"stop"}]}\n\n');
      };
      let clarifying = false;
      let reply = "";
      for await (const delta of modelAnswer("giải thích đi", evidence, new AbortController().signal, {
        onClarification: () => { clarifying = true; },
      })) reply += delta;
      assert.equal(clarifying, true);
      assert.equal(reply, "Bạn muốn hỏi cụ thể điều gì?");
    },
  );
  await t.test(
    "chat finalization, duplicate IDs and cancellation release the notebook slot",
    async () => {
      const rag = require("../dist/infrastructure/integrations/rag.client");
      const models = require("../dist/infrastructure/integrations/llm.client");
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
      const chat = new ChatService(sourcesService, studio);
      const greetingOutput = new Output();
      const greetingId = randomUUID();
      rag.retrieve = async () => { throw new Error("Greetings must not retrieve documents"); };
      const answerModel = models.modelAnswer;
      models.modelAnswer = async function* () { throw new Error("Greetings must not call the model"); };
      await chat.answer(actor, notebook.id, "hello", [source.id], greetingId, greetingOutput);
      assert.match(greetingOutput.text, /event: done/);
      assert.doesNotMatch(greetingOutput.text, /event: error|RETRIEVING/);
      const savedGreeting = (await pg.query("SELECT content,citations FROM notebook_ai.messages WHERE notebook_id=$1 AND role='ASSISTANT' ORDER BY created_at DESC LIMIT 1", [notebook.id])).rows[0];
      assert.equal(savedGreeting.content, greetingReply("hello"));
      assert.deepEqual(savedGreeting.citations, []);
      const unclearOutput = new Output();
      await chat.answer(actor, notebook.id, "giải thích đi", [source.id], randomUUID(), unclearOutput);
      assert.match(unclearOutput.text, /event: done/);
      assert.doesNotMatch(unclearOutput.text, /event: error|RETRIEVING/);
      rag.retrieve = async () => ({ evidence: [{ id: "chunk", sourceId: source.id, text: "evidence", position: 0 }] });
      models.modelAnswer = answerModel;
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
      models.modelAnswer = async function* (_question, _evidence, _signal, options) {
        options.onClarification();
        yield "Bạn muốn mình giải thích phần nào của tài liệu?";
      };
      const clarificationOutput = new Output();
      await chat.answer(actor, notebook.id, "giải thích khái niệm này", [source.id], randomUUID(), clarificationOutput);
      assert.match(clarificationOutput.text, /event: done/);
      assert.doesNotMatch(clarificationOutput.text, /event: error/);
      const savedClarification = (await pg.query("SELECT content,citations FROM notebook_ai.messages WHERE notebook_id=$1 AND role='ASSISTANT' ORDER BY created_at DESC LIMIT 1", [notebook.id])).rows[0];
      assert.equal(savedClarification.content, "Bạn muốn mình giải thích phần nào của tài liệu?");
      assert.deepEqual(savedClarification.citations, []);
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
      rag.retrieve = async () => { throw new Error("Whole-file summary must not use excerpt retrieval"); };
      models.modelAnswer = async function* () { throw new Error("Whole-file summary must not call the chat model"); };
      const summaryOutput = new Output();
      await chat.answer(actor, notebook.id, "tóm tắt các file cho tôi", [source.id], randomUUID(), summaryOutput);
      assert.match(summaryOutput.text, /event: done/);
      assert.match(summaryOutput.text, /ngay tại đây/);
      assert.doesNotMatch(summaryOutput.text, /event: error/);
      const artifact = await studio.artifact(actor, notebook.id, "SUMMARY", [source.id]);
      assert.deepEqual(artifact.sources, [{ id: source.id, revision: "r1" }]);
      assert.ok(jobs.some(([kind, id]) => kind === "summary" && id === artifact.id));
      const pendingSummary = (await notebooks.get(actor, notebook.id)).messages.find((message) => message.artifact_id === artifact.id);
      assert.equal(pendingSummary.summary_status, "QUEUED");
      await assert.rejects(studio.note(actor, notebook.id, { title: "Pending", messageId: pendingSummary.id }), (error) => error.getStatus() === 400);
      await pg.query("UPDATE notebook_ai.artifacts SET status='COMPLETED',content='Natural summary [[S1]]',citations='[]' WHERE id=$1", [artifact.id]);
      const readySummary = (await notebooks.get(actor, notebook.id)).messages.find((message) => message.artifact_id === artifact.id);
      assert.equal(readySummary.content, "Natural summary [[S1]]");
      assert.equal((await studio.note(actor, notebook.id, { title: "Summary", messageId: pendingSummary.id })).content, readySummary.content);
      await assert.rejects(studio.artifact(actor, notebook.id, "SUMMARY", [randomUUID()]), (error) => error.getStatus() === 400);
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
