/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const {
  createSourceLoader,
} = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../../.."));

test("Documents illustration shows shared file icons and unsupported preview guidance without live viewers", () => {
  const { DocumentsPreview } = load(
    "features/landing/components/preview/documents-preview.tsx",
  );
  const markup = renderToStaticMarkup(React.createElement(DocumentsPreview));
  for (const label of [
    "Interview notes.docx",
    "Project timeline.xlsx",
    "Sample unsupported file preview",
    "Preview is not supported for this file",
    "Download file",
    "Sample document version management",
    "Save current version",
    "Sample version upload status",
    "Sample version actions",
    "Delete version",
    "Sample restricted file access",
    "Shared by email",
    "Restricted",
    "Sample Send a copy to existing DMs",
    "Channels: choose one Space and one Channel.",
  ]) {
    assert.ok(markup.includes(label), label);
  }
  assert.doesNotMatch(markup, /<iframe|<button|<input|<textarea/);
});

test("Messages illustration includes selected invitation member avatar chips", () => {
  const { MessagesPreview } = load(
    "features/landing/components/preview/messages-preview.tsx",
  );
  const markup = renderToStaticMarkup(React.createElement(MessagesPreview));
  assert.match(markup, /Sample selected space invitation member/);
  assert.match(markup, /Invite Members to Space/);
  assert.doesNotMatch(markup, /<button|<input|<textarea/);
});

test("Pomodoro illustration follows the centered timer, source panels and report layout", () => {
  const { PomodoroPreview } = load(
    "features/landing/components/preview/pomodoro-preview.tsx",
  );
  const markup = renderToStaticMarkup(React.createElement(PomodoroPreview));
  for (const label of [
    "Timer settings",
    "Ready to start",
    "Stop &amp; save",
    "Free focus",
    "Calendar tasks",
    "Project tasks",
    "Today&#x27;s performance",
    "History &amp; reports",
    "Session history",
    "Daily stats",
  ])
    assert.ok(markup.includes(label), label);
  assert.ok(
    markup.indexOf("Sample centered Pomodoro timer") <
      markup.indexOf("Sample focus task selection"),
  );
  assert.ok(
    markup.indexOf("Sample focus task selection") <
      markup.indexOf("Sample daily performance"),
  );
  assert.doesNotMatch(markup, /Deep focus|Current focus|Change focus/);
  // An illustration cannot start a timer, request microphone access or edit tasks.
  assert.doesNotMatch(markup, /<button|<input|<textarea/);
});

test("Notebook preview shows sources, citations and notes without implying live workspace records", () => {
  const { NotebookPreview } = load(
    "features/landing/components/preview/notebook-preview.tsx",
  );
  const markup = renderToStaticMarkup(React.createElement(NotebookPreview));
  for (const label of [
    "Research brief.pdf",
    "Interview notes.docx",
    "Chat",
    "Your notebooks",
    "Create new notebook",
    "Academic",
    "Notes",
    "Illustrative answer",
    "1 · Research brief",
  ])
    assert.ok(markup.includes(label), label);
  assert.doesNotMatch(markup, /<button|<input|<textarea/);
});

test("Dashboard preview shows KPI cards, tasks, schedule, notebooks and storage without live controls", () => {
  const { DashboardPreview } = load(
    "features/landing/components/preview/dashboard-preview.tsx",
  );
  const markup = renderToStaticMarkup(React.createElement(DashboardPreview));
  for (const label of [
    "Overdue",
    "Due today",
    "Focus today",
    "Next meeting",
    "My tasks",
    "My day",
    "Recent AI Notebooks",
    "Documents &amp; Storage",
  ])
    assert.ok(markup.includes(label), label);
  assert.doesNotMatch(markup, /<button|<input|<textarea/);
});
