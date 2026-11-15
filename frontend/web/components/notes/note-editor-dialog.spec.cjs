/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const {
  createSourceLoader,
} = require("../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../.."));

function fixture(save, initial = {}) {
  let index = 0,
    refIndex = 0,
    closed = 0;
  const state = [],
    refs = [];
  const { NoteEditorDialog } = load("components/notes/note-editor-dialog.tsx", {
    react: {
      ...React,
      useId: () => "note",
      useRef: (value) => (refs[refIndex++] ??= { current: value }),
      useState: (value) => {
        const position = index++;
        if (!(position in state)) state[position] = value;

        return [
          state[position],
          (update) => {
            state[position] =
              typeof update === "function" ? update(state[position]) : update;
          },
        ];
      },
    },
  });
  const render = () => {
    index = 0;
    refIndex = 0;

    return NoteEditorDialog({
      initialTitle: "Title",
      initialContent: "Body",
      ...initial,
      renderPreview: (text) => text,
      onClose: () => {
        closed++;
      },
      onSave: save,
    });
  };
  const form = (tree) =>
    tree.props.children[0].props.children.props.children.find(
      (child) => child?.type === "form",
    );

  return { state, render, form, closed: () => closed };
}

test("shared note save blocks duplicate submits and closes only after confirmed success", async () => {
  let calls = 0,
    release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  const f = fixture(async () => {
    calls++;
    await wait;

    return true;
  });
  const form = f.form(f.render());
  const first = form.props.onSubmit({ preventDefault() {} });
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(calls, 1);
  assert.equal(f.closed(), 0);
  release();
  await first;
  assert.equal(f.closed(), 1);
});

test("both thrown errors and failed receipts retain the draft and allow an explicit retry", async () => {
  for (const failure of [false, new Error("Unavailable")]) {
    let calls = 0;
    const f = fixture(async () => {
      if (++calls === 1) {
        if (failure instanceof Error) throw failure;

        return failure;
      }

      return true;
    });
    await f.form(f.render()).props.onSubmit({ preventDefault() {} });
    assert.equal(f.closed(), 0);
    assert.equal(f.state[0], "Title");
    assert.equal(f.state[1], "Body");
    assert.match(f.state[4], /Unable to save/);
    await f.form(f.render()).props.onSubmit({ preventDefault() {} });
    assert.equal(f.closed(), 1);
  }
});

test("missing title and oversized notebook content cannot bypass form validation", async () => {
  let calls = 0;
  for (const initial of [
    { initialTitle: "  " },
    { initialContent: "x".repeat(20001), maxContentLength: 20000 },
  ]) {
    const f = fixture(async () => {
      calls++;
    }, initial);
    await f.form(f.render()).props.onSubmit({ preventDefault() {} });
    assert.equal(f.closed(), 0);
  }
  assert.equal(calls, 0);
});

test("clean dismissal closes immediately; dirty Cancel/Escape/outside share discard confirmation", () => {
  const f = fixture(() => true);
  let tree = f.render();
  tree.props.children[0].props.onOpenChange(false);
  assert.equal(f.closed(), 1);
  f.state[0] = "Changed";
  tree = f.render();
  tree.props.children[0].props.onOpenChange(false);
  assert.equal(f.closed(), 1);
  tree = f.render();
  const confirmation = tree.props.children[1];
  assert.ok(confirmation);
  const buttons = confirmation.props.children.props.children[1].props.children;
  buttons[0].props.onClick();
  assert.equal(f.state[3], false);
  assert.equal(f.state[0], "Changed");
  tree.props.children[0].props.onOpenChange(false);
  tree = f.render();
  tree.props.children[1].props.children.props.children[1].props.children[1].props.onClick();
  assert.equal(f.closed(), 2);
});
