/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hook harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));

function fixture({ folder = false, gate = null } = {}) {
  const states = [],
    refs = [],
    calls = [];
  let stateIndex = 0,
    refIndex = 0,
    actor = "owner",
    completed = 0,
    failNext = "dm-b",
    versionsRead = 0,
    changeDuringSend = false;
  const { useDocumentCopyDelivery } = load(
    "features/documents/hooks/use-document-copy-delivery.ts",
    {
      react: {
        ...React,
        useState(initial) {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;

          return [
            states[index],
            (next) => {
              states[index] =
                typeof next === "function" ? next(states[index]) : next;
            },
          ];
        },
        useRef(initial) {
          return (refs[refIndex++] ??= { current: initial });
        },
      },
      "@/store/store": {
        store: { getState: () => ({ auth: { userId: actor } }) },
      },
      "../api/documents.api": {
        documentsApi: {
          getVersions: async () => {
            versionsRead++;

            return [
              { id: "latest-upload", isCurrent: false },
              { id: "chosen-current", isCurrent: true },
            ];
          },
        },
      },
      "../utils/share-document-to-chat": {
        shareDocumentToChat: async (options) => {
          calls.push(options);
          if (gate) await gate;
          if (changeDuringSend) actor = "another-account";
          if (options.target.chatId === failNext) {
            failNext = null;
            throw new Error("Destination unavailable");
          }
        },
      },
      sonner: { toast: { success() {} } },
    },
  );
  const render = () => {
    stateIndex = refIndex = 0;

    return useDocumentCopyDelivery(
      { id: "file", type: folder ? "FOLDER" : "FILE" },
      "owner",
      () => completed++,
    );
  };

  return {
    render,
    calls,
    versionsRead: () => versionsRead,
    completed: () => completed,
    changeActorDuringSend: () => {
      changeDuringSend = true;
    },
    allowAll: () => {
      failNext = null;
    },
  };
}

const targets = [
  { type: "direct", chatId: "dm-a", label: "Alice" },
  { type: "direct", chatId: "dm-b", label: "Bob" },
];

test("one batch pins Current for every DM and retries failed destinations without resending successes", async () => {
  const f = fixture();
  await f.render().send(targets, "Introduction");
  let hook = f.render();
  assert.deepEqual(
    hook.batch.deliveries.map((delivery) => delivery.status),
    ["sent", "failed"],
  );
  assert.equal(hook.configurationLocked, true);
  assert.equal(f.completed(), 0);
  await hook.send(targets, "changed text must not alter the retry");
  hook = f.render();
  assert.deepEqual(
    f.calls.map((call) => call.target.chatId),
    ["dm-a", "dm-b", "dm-b"],
  );
  assert.ok(f.calls.every((call) => call.sourceVersionId === "chosen-current"));
  assert.ok(f.calls.every((call) => call.introMessage === "Introduction"));
  assert.deepEqual(
    hook.batch.deliveries.map((delivery) => delivery.status),
    ["sent", "sent"],
  );
  assert.equal(f.versionsRead(), 1);
  assert.equal(f.completed(), 1);
});

test("double submission cannot create a second in-flight batch", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const f = fixture({ gate });
  f.allowAll();
  const hook = f.render();
  const first = hook.send(targets, "");
  await hook.send(targets, "");
  release();
  await first;
  assert.equal(f.calls.length, 2);
  assert.equal(f.versionsRead(), 1);
  assert.equal(f.completed(), 1);
});

test("an account change stops delivery before the next recipient", async () => {
  const f = fixture();
  f.allowAll();
  f.changeActorDuringSend();
  await f.render().send(targets, "");
  assert.equal(f.calls.length, 1);
  assert.equal(f.completed(), 0);
  assert.match(f.render().error, /account changed/);
});

test("folder copies keep their existing ZIP flow without requesting a file version", async () => {
  const f = fixture({ folder: true });
  f.allowAll();
  await f
    .render()
    .send([{ type: "channel", chatId: "channel", label: "#general" }], "");
  assert.equal(f.versionsRead(), 0);
  assert.equal(f.calls[0].isFolder, true);
  assert.equal(f.completed(), 1);
});
