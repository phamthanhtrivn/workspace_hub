const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { cases, gradeStructured } = require("../scripts/conversation-model-cases.cjs");
const dataset = require("../evaluation/conversations.json");
const passed = (checks) => Object.values(checks).every(Boolean);

test("model data has unique IDs and contains both positive and negative reference answers", () => {
  assert.equal(dataset.synthetic, true);
  assert.equal(new Set(cases.map((item) => item.id)).size, cases.length);
  for (const item of dataset.cases) {
    assert.ok(item.category && item.question && item.incorrectAnswers.length);
    assert.ok([0, 1].includes(item.expectedHistoryReads));
    assert.ok(item.history.length <= 30);
    assert.ok(item.history.every((message) => message.senderName && message.content));
    assert.ok(item.expected && !Array.isArray(item.expected));
  }
  assert.ok(!JSON.stringify(dataset).includes("\uFFFD"));
});

for (const fixture of dataset.cases)
  test(`grader/${fixture.id}: reject incorrect facts, types, extra claims and wrong history scope`, () => {
    const good = JSON.stringify(fixture.expected);
    assert.equal(passed(gradeStructured(good, fixture.expectedHistoryReads, fixture)), true);
    assert.equal(passed(gradeStructured(`\u0060\u0060\u0060json\n${good}\n\u0060\u0060\u0060`, fixture.expectedHistoryReads, fixture)), true);
    for (const bad of fixture.incorrectAnswers)
      assert.equal(passed(gradeStructured(JSON.stringify(bad), fixture.expectedHistoryReads, fixture)), false);
    const extra = JSON.stringify({ ...fixture.expected, inventedClaim: "production deployed" });
    assert.equal(passed(gradeStructured(extra, fixture.expectedHistoryReads, fixture)), false);
    assert.equal(passed(gradeStructured(good, 1 - fixture.expectedHistoryReads, fixture)), false);
    for (const malformed of ["not JSON", "null", "[]", "{}", good + " trailing text"])
      assert.equal(passed(gradeStructured(malformed, fixture.expectedHistoryReads, fixture)), false);
  });

test("evaluator lists or selects cases without reading config or calling a model", () => {
  const run = (args) => spawnSync(process.execPath, ["scripts/evaluate-conversation-model.cjs", ...args], {
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
    env: { ...process.env, LLM_BASE_URL: "not-a-url", DOTENV_CONFIG_PATH: "test/no-env" },
  });
  const list = run(["--list", "--case", "eval-history-injection"]);
  assert.equal(list.status, 0, list.stderr);
  assert.deepEqual(JSON.parse(list.stdout), [{ id: "eval-history-injection", category: "prompt-injection" }]);
  assert.equal(JSON.parse(run(["--list", "--limit", "2"]).stdout).length, 2);
  for (const args of [["--case", "unknown"], ["--limit", "0"], ["--limit", "1.5"], ["--case"]]) {
    const failed = run(args);
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /Unknown evaluation case|--limit|--case/);
  }
});
