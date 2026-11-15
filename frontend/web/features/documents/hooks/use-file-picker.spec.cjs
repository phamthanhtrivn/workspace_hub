/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));
function fixture(onConfirm, overrides = {}) {
  const states = [],
    refs = [],
    queries = [],
    effects = [];
  let index = 0,
    refIndex = 0,
    account = "owner",
    completed = 0;
  const { useFilePicker } = load(
    "features/documents/hooks/use-file-picker.ts",
    {
      react: {
        ...React,
        useEffect(effect) {
          effects.push(effect());
        },
        useRef: (value) => (refs[refIndex++] ??= { current: value }),
        useState: (value) => {
          const key = index++;
          if (!(key in states)) states[key] = value;

          return [
            states[key],
            (update) => {
              states[key] =
                typeof update === "function" ? update(states[key]) : update;
            },
          ];
        },
      },
      "@tanstack/react-query": {
        useQuery: (query) => {
          queries.push(query);

          return {};
        },
      },
      "@/store/store": {
        useAppSelector: (selector) => selector({ auth: { userId: account } }),
        store: { getState: () => ({ auth: { userId: account } }) },
      },
      "@/features/chat/hooks/useDebouncedValue": {
        useDebouncedValue: (value) => value,
      },
      "../utils/file-copy-attempt": {
        fileCopyAttempt: async () => ({
          operationId: "stable-operation",
          complete() {
            completed++;
          },
        }),
      },
    },
  );

  return {
    unmount() {
      effects.at(-1)?.();
    },
    queries,
    states,
    completed: () => completed,
    changeAccount: () => {
      account = "other";
    },
    render() {
      index = 0;
      refIndex = 0;

      return useFilePicker({ context: "notebook:id", onConfirm, ...overrides });
    },
  };
}
const file = (id) => ({
  id,
  versionId: "v1",
  name: id + ".pdf",
  sizeBytes: 100,
  type: "FILE",
});
test("closing the dialog after confirmed success clears the attempt despite unmount cancellation", async () => {
  const f = fixture(async () => {
    f.unmount();
  });
  f.render().toggle(file("one"));
  await f.render().confirm();
  assert.equal(f.completed(), 1);
});
test("selection survives folders/pages; confirmations share one in-flight operation", async () => {
  let release,
    calls = 0;
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  const f = fixture(async (files, operationId) => {
    calls++;
    assert.equal(operationId, "stable-operation");
    assert.equal(files.length, 2);
    await waiting;
  });
  let p = f.render();
  p.toggle(file("one"));
  p.toggle(file("two"));
  p.setPage(2);
  p = f.render();
  p.navigate([{ id: "folder", name: "Research" }]);
  p = f.render();
  assert.equal(p.selected.length, 2);
  const first = p.confirm();
  const second = p.confirm();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  await Promise.all([first, second]);
  assert.equal(f.render().selected.length, 0);
  assert.equal(f.completed(), 1);
});
test("failed copies retain selection; account changes prevent submit and clear prior account selections", async () => {
  let calls = 0;
  const f = fixture(async () => {
    calls++;
    throw Error("Unavailable");
  });
  f.render().toggle(file("one"));
  await f.render().confirm();
  assert.equal(f.render().selected.length, 1);
  assert.ok(f.render().error);
  const old = f.render();
  f.changeAccount();
  await old.confirm();
  assert.equal(calls, 1);
  f.render();
  assert.equal(f.render().selected.length, 0);
});
test("rapid checkbox changes cannot bypass selection capacity; cache is account/folder scoped", () => {
  const f = fixture(async () => {}, { maxSelection: 1 });
  const p = f.render();
  p.toggle(file("one"));
  p.toggle(file("two"));
  assert.deepEqual(
    f.render().selected.map((file) => file.id),
    ["one"],
  );
  const options = f.queries.at(-1);
  assert.equal(options.staleTime, 30000);
  assert.equal(options.gcTime, 300000);
  assert.ok(options.queryKey.includes("owner"));
});
