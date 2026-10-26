const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createShutdownHandler, settleAll } = require("../dist/common/shutdown");
const { logError } = require("../dist/common/errors/error-log");

test("shutdown is idempotent and keeps its deadline until all cleanup tasks settle", async (t) => {
  let release,
    drains = 0,
    deadline,
    cleared = 0;
  t.mock.method(global, "setTimeout", (run, ms) => {
    assert.equal(ms, 1000);
    deadline = run;
    return "deadline";
  });
  t.mock.method(global, "clearTimeout", (timer) => {
    assert.equal(timer, "deadline");
    cleared++;
  });
  const logs = [];
  t.mock.method(console, "error", (line) => logs.push(JSON.parse(line)));
  const exitCode = process.exitCode;
  t.after(() => {
    process.exitCode = exitCode;
  });
  const shutdown = createShutdownHandler(
    "fixture",
    async () => {
      drains++;
      await settleAll([
        Promise.reject(new Error("private credential")),
        new Promise((resolve) => {
          release = resolve;
        }),
      ]);
    },
    1000,
  );
  const first = shutdown();
  assert.equal(shutdown(), first);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(drains, 1);
  assert.equal(cleared, 0);
  assert.equal(typeof deadline, "function");
  release();
  await first;
  assert.equal(cleared, 1);
  assert.equal(process.exitCode, 1);
  assert.equal(logs[0].event, "ai_shutdown_failed");
  assert.doesNotMatch(JSON.stringify(logs), /private credential/);
});

test("a stuck shutdown exits with a safe diagnostic when the deadline expires", async (t) => {
  let deadline, release;
  t.mock.method(global, "setTimeout", (run) => {
    deadline = run;
    return 1;
  });
  t.mock.method(global, "clearTimeout", () => {});
  const exits = [],
    logs = [];
  t.mock.method(process, "exit", (code) => exits.push(code));
  t.mock.method(console, "error", (line) => logs.push(JSON.parse(line)));
  const shutdown = createShutdownHandler(
    "worker",
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    1000,
  );
  const pending = shutdown();
  await Promise.resolve();
  deadline();
  assert.deepEqual(exits, [1]);
  assert.equal(logs[0].event, "ai_shutdown_timeout");
  assert.equal(logs[0].timeout_ms, 1000);
  release();
  await pending;
});

test("diagnostics include allowlisted codes without error messages, stack or arbitrary codes", (t) => {
  const logs = [];
  t.mock.method(console, "error", (line) => logs.push(JSON.parse(line)));
  logError(
    "fixture",
    Object.assign(new Error("secret prompt and API key"), {
      code: "ECONNRESET",
    }),
    { id: "job-1" },
  );
  logError("fixture", { message: "private document", code: "private-key" });
  assert.equal(logs[0].error_code, "ECONNRESET");
  assert.equal(logs[0].id, "job-1");
  assert.equal(logs[1].error_code, undefined);
  assert.doesNotMatch(JSON.stringify(logs), /secret|private|stack/);
});
