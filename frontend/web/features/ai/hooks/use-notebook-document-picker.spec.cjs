const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { createSourceLoader } = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));
const file = id => ({ id, name: `${id}.pdf`, type: "FILE", sizeBytes: 100 });

function fixture(send, sources = []) {
  const state = [], refs = [], pending = [];
  let index = 0, refIndex = 0, owner = "owner", refreshed = 0;
  const { useNotebookDocumentPicker } = load("features/ai/hooks/use-notebook-document-picker.ts", {
    react: { ...React, useRef: value => refs[refIndex++] ??= { current: value }, useState: value => {
      const position = index++;
      if (!(position in state)) state[position] = value;
      return [state[position], update => { state[position] = typeof update === "function" ? update(state[position]) : update; }];
    } },
    "@tanstack/react-query": { useQuery: () => ({}) },
    "@/store/store": { useAppSelector: selector => selector({ auth: { userId: owner } }), store: { getState: () => ({ auth: { userId: owner } }) } },
    "@/features/chat/hooks/useDebouncedValue": { useDebouncedValue: value => value },
    "../api/notebooks.api": { notebooksApi: { add: send } },
  });
  return {
    render() { index = 0; refIndex = 0; return useNotebookDocumentPicker({ notebookId: "notebook", sources, disabled: false, onAdded: async () => { refreshed++; }, onPending: value => pending.push(value) }); },
    pending, state, refreshed: () => refreshed, changeAccount: () => { owner = "other"; },
  };
}

test("selection survives paging and folders; Add selected sends one batch and blocks double clicks", async () => {
  const calls = []; let release;
  const wait = new Promise(resolve => { release = resolve; });
  const f = fixture(async (...args) => { calls.push(args); await wait; });
  let picker = f.render();
  picker.toggle(file("one")); picker.toggle(file("two")); picker.setPage(2);
  picker = f.render(); picker.navigate([{ id: "folder", name: "Research" }]);
  picker = f.render(); assert.equal(picker.selected.length, 2); assert.equal(calls.length, 0);
  const first = picker.add(); const second = picker.add();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["notebook", ["one", "two"]]);
  release(); await Promise.all([first, second]);
  picker = f.render();
  assert.equal(picker.selected.length, 0); assert.equal(picker.remaining, 3);
  await picker.add(); assert.equal(calls.length, 1);
  assert.deepEqual(f.pending, [true, false]); assert.equal(f.refreshed(), 1);
});

test("source slots, unsupported files and batch bytes constrain selection", () => {
  const f = fixture(async () => {}, Array.from({ length: 4 }, (_, i) => ({ document_id: `existing-${i}`, size_bytes: 100 })));
  let picker = f.render(); picker.toggle(file("one")); picker.toggle(file("two")); picker.toggle({ ...file("bad"), name: "bad.exe" });
  picker = f.render(); assert.deepEqual(picker.selected.map(document => document.id), ["one"]);
  const sizes = fixture(async () => {});
  picker = sizes.render();
  for (const id of ["a", "b", "c"]) picker.toggle({ ...file(id), sizeBytes: 19 * 1024 * 1024 });
  assert.equal(sizes.render().selected.length, 2);
});

test("failed batch keeps selection for retry; account changes prevent submitting it", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; throw Error("Unavailable"); });
  f.render().toggle(file("one"));
  await f.render().add();
  const picker = f.render(); assert.equal(picker.selected.length, 1); assert.ok(picker.error);
  f.changeAccount(); await picker.add();
  assert.equal(calls, 1);
});
