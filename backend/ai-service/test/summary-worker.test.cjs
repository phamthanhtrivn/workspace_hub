const { test } = require("node:test");
const assert = require("node:assert/strict");
const timers = require("node:timers/promises");
const {
  ModelMinuteQuotaException,
} = require("../dist/common/errors/model-quota.exception");
const {
  TooManyRequestsException,
} = require("../dist/common/errors/rate-limit.exception");
let model, updates;
const source = {
  id: "source",
  revision: "r1",
  status: "READY",
  chunk_count: 1,
  name: "fixture.md",
};
require.cache[require.resolve("../dist/infrastructure/database/database")] = {
  exports: {
    rows: async (sql, values) => {
      if (sql.includes("SELECT a.*"))
        return [
          {
            id: "artifact",
            notebook_id: "notebook",
            owner_id: "owner",
            owner_email: "fixture@example.test",
            status: "QUEUED",
            kind: "SUMMARY",
            sections: [],
            sources: [{ id: source.id, revision: source.revision }],
          },
        ];
      if (sql.startsWith("SELECT status")) return [{ status: "RUNNING" }];
      updates.push({ sql, values });
      return [];
    },
  },
};
require.cache[
  require.resolve("../dist/infrastructure/integrations/llm.client")
] = { exports: { modelAnswer: (...args) => model(...args) } };
require.cache[
  require.resolve("../dist/infrastructure/integrations/document.client")
] = { exports: { authorizeSources: async () => {} } };
require.cache[require.resolve("../dist/modules/sources/sources.service")] = {
  exports: {
    SourcesService: class {
      async sources() {
        return [source];
      }
    },
  },
};
require.cache[
  require.resolve("../dist/infrastructure/integrations/rag.client")
] = {
  exports: {
    rag: async (_path, body) => {
      assert.deepEqual(body.sourceIds, [source.id]);
      return {
        evidence: [
          { id: "chunk", sourceId: source.id, text: "fixture", position: 0 },
        ],
      };
    },
  },
};
const { summarize } = require("../dist/jobs/summary.processor");

test("summary waits for local minute quota without replaying any provider response", async (t) => {
  updates = [];
  let attempts = 0,
    waits = 0;
  t.mock.method(timers, "setTimeout", async (ms, _value, options) => {
    assert.equal(ms, 60000);
    assert.equal(options.signal.aborted, false);
    waits++;
    assert.ok(updates.some(({ sql }) => sql.includes("in_flight=false")));
  });
  model = async function* (question, _evidence, _signal, options) {
    assert.doesNotMatch(question, /phần \d+\//);
    assert.equal(options.purpose, "summary");
    if (++attempts === 1) throw new ModelMinuteQuotaException();
    yield "Summary [[S1]]";
  };
  await summarize("artifact");
  assert.equal(attempts, 2);
  assert.equal(waits, 1);
  assert.ok(updates.some(({ sql }) => sql.includes("status='COMPLETED'")));
  const complete = updates.find(({ sql }) =>
    sql.includes("status='COMPLETED'"),
  );
  assert.equal(complete.values[1], "Summary [[S1]]");
});

test("daily quota, truncation and errors after partial output are never retried", async (t) => {
  let waits = 0;
  t.mock.method(timers, "setTimeout", async () => {
    waits++;
  });
  for (const [error, partial] of [
    [new TooManyRequestsException("daily"), false],
    [new Error("length"), true],
    [new ModelMinuteQuotaException(), true],
  ]) {
    updates = [];
    let attempts = 0;
    model = async function* () {
      attempts++;
      if (partial) yield "partial";
      throw error;
    };
    await assert.rejects(summarize("artifact"));
    assert.equal(attempts, 1);
    assert.ok(!updates.some(({ sql }) => sql.includes("status='COMPLETED'")));
  }
  assert.equal(waits, 0);
});
