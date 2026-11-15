const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { createSourceLoader } = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));
const notebook = { id: "notebook", title: "Research", sources: [], messages: [], notes: [] };
const noop = () => {};

test("chat renders without starting AI, hides revoked messages/drafts, and disables sending without ready sources", () => {
  let requests = 0;
  const { NotebookChatPanel } = load("features/ai/components/notebook-chat-panel.tsx", {
    "./citations": { Citations: ({ content }) => React.createElement("p", null, content) },
    "./answer-content": { AnswerContent: ({ content }) => React.createElement("p", null, content) },
  });
  const html = renderToStaticMarkup(React.createElement(NotebookChatPanel, {
    notebook: { ...notebook, messages: [{ id: "hidden", role: "ASSISTANT", hidden: true, content: "PRIVATE MESSAGE", citations: [] }] },
    selected: [], saving: false, pendingAction: null, run: noop, onSources: noop, onAddSources: noop,
    chat: { busy: false, error: "Source access changed", retryQuestion: "", stage: "", ask: () => { requests++; }, cancel: noop,
      draft: { text: "PRIVATE DRAFT", refs: [{ id: "revoked", revision: "old" }] } },
  }));
  assert.equal(requests, 0);
  assert.ok(!html.includes("PRIVATE MESSAGE"));
  assert.ok(!html.includes("PRIVATE DRAFT"));
  assert.match(html, /Content is hidden/);
  assert.match(html, /disabled=""[^>]*>[\s\S]*?Send<\/button>/);
});

test("notes render content only when expanded and remove an editor when its source becomes inaccessible", () => {
  let reads = 0;
  const hidden = { id: "note", title: "Saved answer", content: "PRIVATE NOTE", citations: [], hidden: true };
  const cleared = [];
  let index = 0;
  const { NotesPanel } = load("features/ai/components/notes-panel.tsx", {
    react: { ...React, useState: () => index++ === 0 ? ["note", noop] : [{ type: "edit", id: "note" }, value => cleared.push(value)] },
    "./citations": { Citations: () => { reads++; return React.createElement("p", null, "PRIVATE NOTE"); } },
    "./note-dialog": { NoteDialog: () => React.createElement("div", null, "PRIVATE EDITOR") },
  });
  const html = renderToStaticMarkup(React.createElement(NotesPanel, { notebook: { ...notebook, notes: [hidden] }, saving: false, run: noop }));
  assert.equal(reads, 0);
  assert.deepEqual(cleared, [null]);
  assert.ok(!html.includes("PRIVATE NOTE"));
  assert.ok(!html.includes("PRIVATE EDITOR"));
  assert.match(html, /hidden because a source/);
});

test("saving a note blocks duplicate submits and closes only after the API succeeds", async () => {
  let calls = 0, closed = 0, release;
  const wait = new Promise(resolve => { release = resolve; });
  let saving;
  const { NoteDialog } = load("features/ai/components/note-dialog.tsx", {
    react: { ...React, useId: () => "note", useRef: value => ({ current: value }), useState: value => [value, noop] },
    "../api/notebooks.api": { notebooksApi: { note: async () => { calls++; await wait; } } },
  });
  const tree = NoteDialog({ notebookId: "notebook", note: { id: "note", title: "Title", content: "Body" }, saving: false, onClose: () => { closed++; }, run: operation => { saving = operation(); } });
  const form = tree.props.children.props.children.find(child => child?.type === "form");
  form.props.onSubmit({ preventDefault: noop });
  form.props.onSubmit({ preventDefault: noop });
  assert.equal(calls, 1);
  assert.equal(closed, 0);
  release();
  await saving;
  assert.equal(closed, 1);
});

test("a failed note save keeps the editor open and allows one explicit retry", async () => {
  let calls = 0, closed = 0, running;
  const errors = [];
  const { NoteDialog } = load("features/ai/components/note-dialog.tsx", {
    react: { ...React, useId: () => "note", useRef: value => ({ current: value }), useState: value => [value, update => errors.push(update)] },
    "../api/notebooks.api": { notebooksApi: { note: async () => { if (++calls === 1) throw Error("Unavailable"); } } },
  });
  const tree = NoteDialog({ notebookId: "notebook", note: { id: "note", title: "Title", content: "Body" }, saving: false, onClose: () => { closed++; }, run: operation => { running = operation(); } });
  const form = tree.props.children.props.children.find(child => child?.type === "form");
  form.props.onSubmit({ preventDefault: noop });
  await assert.rejects(running);
  assert.equal(closed, 0);
  assert.ok(errors.some(error => error.includes("Unable to save")));
  form.props.onSubmit({ preventDefault: noop });
  await running;
  assert.equal(calls, 2);
  assert.equal(closed, 1);
});
