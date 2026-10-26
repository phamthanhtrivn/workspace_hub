const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
let generate, requestStatus, statusReads;
const config = { CHAT_CANCEL_POLL_MS: 2000 };
for (const [file, exports] of [
  ["config/env.config", { config }],
  [
    "infrastructure/database/database",
    {
      rows: async (sql) => {
        if (sql.startsWith("SELECT status")) {
          statusReads++;
          return [{ status: requestStatus }];
        }
        return [];
      },
    },
  ],
  [
    "infrastructure/integrations/document.client",
    { authorizeSources: async () => {} },
  ],
  [
    "infrastructure/integrations/rag.client",
    { retrieve: async () => ({ evidence: [] }) },
  ],
  ["modules/sources/sources.service", { SourcesService: class {} }],
  ["modules/studio/studio.service", { StudioService: class {} }],
  ["common/auth/notebook-access", { ownedNotebook: async () => {} }],
  [
    "modules/chat/chat-request",
    {
      startChatRequest: async () => {},
      completeChatRequest: async () =>
        assert.fail("Cancelled generation cannot complete"),
    },
  ],
  ["modules/chat/visual-evidence", { visualEvidence: async () => [] }],
  [
    "modules/chat/chat-response",
    {
      immediateReply: () => "hello",
      generateChatResponse: (...args) => generate(...args),
    },
  ],
])
  require.cache[require.resolve(`../dist/${file}`)] = { exports };
const { ChatService } = require("../dist/modules/chat/chat.service");

test("chat uses configurable cancellation polling and still aborts immediately on disconnect", async (t) => {
  for (const disconnect of [false, true])
    await t.test(disconnect ? "disconnect" : "remote cancel", async (t) => {
      const timers = [];
      t.mock.method(global, "setInterval", (run, ms) => {
        const timer = { run, ms };
        timers.push(timer);
        return timer;
      });
      t.mock.method(global, "clearInterval", (timer) => {
        timer.cleared = true;
      });
      requestStatus = "RUNNING";
      statusReads = 0;
      let signal;
      generate = (_question, _citations, abortSignal) =>
        new Promise((_resolve, reject) => {
          signal = abortSignal;
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        });
      const source = {
        id: "source",
        revision: "r1",
        status: "READY",
        name: "fixture.txt",
      };
      const service = new ChatService({ sources: async () => [source] }, {});
      const res = new EventEmitter();
      Object.assign(res, {
        status: () => res,
        set: () => res,
        flushHeaders() {},
        write() {},
        end() {
          this.ended = true;
        },
      });
      const pending = service.answer(
        { id: "owner" },
        "notebook",
        "hello",
        ["source"],
        "request",
        res,
      );
      while (!signal) await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(
        timers.map((timer) => timer.ms),
        [2000, 3000],
      );
      assert.equal(statusReads, 0);
      if (disconnect) {
        res.emit("close");
        assert.equal(signal.aborted, true);
        assert.equal(statusReads, 0);
      } else {
        requestStatus = "CANCELLED";
        timers[0].run();
      }
      await pending;
      assert.equal(signal.aborted, true);
      assert.equal(res.ended, true);
      assert.ok(timers.every((timer) => timer.cleared));
      assert.equal(res.listenerCount("close"), 0);
    });
});
