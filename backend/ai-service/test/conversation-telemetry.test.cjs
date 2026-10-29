const { test } = require("node:test");
const assert = require("node:assert/strict");
const { measureConversationStage } = require("../dist/modules/conversation-ai/telemetry");

test("stage logs expose timing and numeric token usage without model content", async t => {
  const logs = [];
  t.mock.method(console, "info", line => logs.push(JSON.parse(line)));
  const answer = { content: "private response", usage_metadata: {
    input_tokens: 100, output_tokens: 20, total_tokens: 120, private: "private metadata",
  } };
  assert.equal(await measureConversationStage("model", async () => answer), answer);
  assert.equal(logs[0].status, "ok");
  assert.deepEqual(logs[0].usage, { input_tokens: 100, output_tokens: 20, total_tokens: 120 });
  assert.ok(logs[0].duration_ms >= 0);
  assert.ok(!JSON.stringify(logs).includes("private"));
});

test("stage failures retain original error without logging its private diagnostics", async t => {
  const logs = [];
  t.mock.method(console, "info", line => logs.push(JSON.parse(line)));
  const error = new Error("private provider diagnostic");
  await assert.rejects(measureConversationStage("extract", async () => { throw error; }), e => e === error);
  assert.equal(logs[0].status, "failed");
  assert.ok(!JSON.stringify(logs).includes("private"));
});
