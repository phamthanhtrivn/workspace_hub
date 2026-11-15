/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));
const { findHelpEntries } = load("features/help/utils/help-search.ts");
const { getHelpTopic } = load("features/help/constants/help-topics.ts");
const { HELP_GUIDES } = load("features/help/constants/help-guides.ts");
const { HELP_TROUBLESHOOTING } = load(
  "features/help/constants/help-troubleshooting.ts",
);
const { HELP_SHORTCUTS } = load("features/help/constants/help-shortcuts.ts");

test("help search finds task wording, instructions, keywords and platform keys", () => {
  assert.ok(
    findHelpEntries(HELP_GUIDES, "AI summary", "all").some(
      (entry) => entry.id === "chat-ai",
    ),
  );
  assert.ok(
    findHelpEntries(HELP_GUIDES, "upload file", "all").some(
      (entry) => entry.id === "documents-organize",
    ),
  );
  assert.ok(
    findHelpEntries(HELP_TROUBLESHOOTING, "camera permission", "all").some(
      (entry) => entry.id === "meeting-devices",
    ),
  );
  assert.ok(
    findHelpEntries(HELP_SHORTCUTS, "⌘ k", "all").some(
      (entry) => entry.id === "document-search",
    ),
  );
  assert.deepEqual(
    findHelpEntries(HELP_GUIDES, "nonexistent nonsense", "all"),
    [],
  );
});

test("topic filters retain global shortcuts and contextual ordering does not mutate shared content", () => {
  const original = HELP_GUIDES.map((entry) => entry.id);
  const results = findHelpEntries(HELP_GUIDES, "", "all", "ai");
  assert.equal(results[0].topic, "ai");
  assert.deepEqual(
    HELP_GUIDES.map((entry) => entry.id),
    original,
  );
  assert.ok(
    findHelpEntries(HELP_GUIDES, "", "meetings").every(
      (entry) =>
        entry.topic === "meetings" || entry.relatedTopics?.includes("meetings"),
    ),
  );
  const shortcuts = findHelpEntries(HELP_SHORTCUTS, "", "calendar");
  assert.ok(shortcuts.some((entry) => entry.id === "help"));
  assert.ok(shortcuts.some((entry) => entry.id === "calendar-create"));
  assert.ok(!shortcuts.some((entry) => entry.id === "document-search"));
});

test("route matching respects segment boundaries and every help topic has guidance", () => {
  assert.equal(getHelpTopic("/ai/notebooks/research"), "ai");
  assert.equal(getHelpTopic("/projects/abc"), "projects");
  assert.equal(getHelpTopic("/projects-archive"), undefined);
  for (const topic of [
    "dashboard",
    "projects",
    "calendar",
    "pomodoro",
    "messages",
    "meetings",
    "documents",
    "ai",
    "account",
  ]) {
    assert.ok(
      HELP_GUIDES.some((entry) => entry.topic === topic),
      topic,
    );
  }
});
