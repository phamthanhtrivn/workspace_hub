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

test("Notebook notes use the shared editor with mandatory title, limits and citation-aware preview", async () => {
  let saved;
  const { NoteDialog } = load("features/ai/components/note-dialog.tsx", {
    "../api/notebooks.api": { notebooksApi: { note: async (_id, draft) => { saved = draft; } } },
  });
  const tree = NoteDialog({ notebookId: "notebook", note: { id: "note", title: "Title", content: "Body", citations: [] }, saving: false, onClose: noop, run: operation => operation().then(() => true) });
  assert.equal(tree.props.initialTitle, "Title");
  assert.equal(tree.props.maxContentLength, 20000);
  assert.equal(tree.props.maxTitleLength, 200);
  assert.equal(await tree.props.onSave({ title: "Updated", content: "Text [[S1]]" }), true);
  assert.deepEqual(saved, { title: "Updated", content: "Text [[S1]]", noteId: "note" });
  assert.deepEqual(tree.props.renderPreview("Preview").props.items, []);
});
