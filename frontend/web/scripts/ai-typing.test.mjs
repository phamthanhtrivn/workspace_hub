import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
function load(path, context = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require, ...context });
  return exports;
}
function setup(scope = {}) {
  let now = 0, seq = 0, active = false;
  const timers = new Map();
  const { createAiTypingTracker, AI_TYPING_TIMEOUT_MS } = load("../features/chat/utils/ai-typing-tracker.ts", {
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimeout: (id) => timers.delete(id),
  });
  const event = { chatId: "chat", chatType: "CHANNEL", threadParentId: null, requestId: "one", isTyping: true, ...scope };
  const tracker = createAiTypingTracker(event, (value) => { active = value; });
  const tick = (ms) => {
    now += ms;
    for (const [id, timer] of [...timers]) {
      if (timer.at <= now) { timers.delete(id); timer.fn(); }
    }
  };
  return { tracker, event, tick, timers, timeout: AI_TYPING_TIMEOUT_MS, active: () => active };
}
for (const chatType of ["CHANNEL", "DIRECT_MESSAGE"]) {
  for (const threadParentId of [null, "root"]) {
    test(`typing isolates ${chatType} thread=${threadParentId}`, () => {
      const { tracker, event, active } = setup({ chatType, threadParentId });
      for (const other of [{ chatId: "other" }, { chatType: "other" }, { threadParentId: threadParentId ? null : "root" }]) {
        tracker.receive({ ...event, ...other });
        assert.equal(active(), false);
      }
      tracker.receive(event);
      assert.equal(active(), true);
      tracker.receive({ ...event, isTyping: false });
      assert.equal(active(), false);
    });
  }
}
test("heartbeats extend expiry; a lost worker automatically stops typing", () => {
  const { tracker, event, active, tick, timeout } = setup();
  tracker.receive(event);
  tick(timeout - 1000);
  tracker.receive(event);
  tick(1000);
  assert.equal(active(), true);
  tick(timeout);
  assert.equal(active(), false);
});
test("one completed request does not hide another pending request", () => {
  const { tracker, event, active } = setup();
  tracker.receive(event);
  tracker.receive({ ...event, requestId: "two" });
  tracker.receive({ ...event, isTyping: false });
  assert.equal(active(), true);
  tracker.receive({ ...event, requestId: "two", isTyping: false });
  assert.equal(active(), false);
});
test("late heartbeats cannot resurrect a completed request, even if stop arrived first", () => {
  const { tracker, event, active } = setup();
  tracker.receive({ ...event, isTyping: false });
  tracker.receive(event);
  assert.equal(active(), false);
});
test("disconnect resets presence and cleanup releases all timers", () => {
  const { tracker, event, active, timers } = setup();
  tracker.receive(event);
  tracker.reset();
  assert.equal(active(), false);
  assert.equal(timers.size, 0);
  tracker.receive(event);
  tracker.settle(event.requestId);
  tracker.clear();
  assert.equal(timers.size, 0);
});
test("indicator has an accessible status and staggered dots respecting reduced motion", () => {
  const { default: Indicator } = load("../features/chat/components/message/ai-typing-indicator.tsx");
  assert.equal(renderToStaticMarkup(createElement(Indicator, { active: false })), "");
  const html = renderToStaticMarkup(createElement(Indicator, { active: true }));
  assert.match(html, /AI đang soạn tin/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.equal((html.match(/motion-safe:animate-bounce/g) || []).length, 3);
  assert.match(html, /animation-delay:150ms/);
  assert.match(html, /animation-delay:300ms/);
});
