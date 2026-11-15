/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");

function renderHelp({ query = "", topic = "all", tab = "guides" } = {}) {
  const load = createSourceLoader(path.resolve(__dirname, "../../.."));
  let stateIndex = 0;
  const initial = [query, topic, tab];
  const { WorkspaceHelpDialog } = load(
    "components/common/workspace-help-dialog.tsx",
    {
      react: {
        ...React,
        useState: (value) => [initial[stateIndex++] ?? value, () => {}],
      },
      "next/navigation": { usePathname: () => "/ai/notebooks/sample" },
      "@/features/help/hooks/use-workspace-help": {
        useWorkspaceHelp: () => ({
          shortcutsEnabled: true,
          setShortcutsEnabled() {},
        }),
      },
      "../hooks/use-workspace-help": {
        useWorkspaceHelp: () => ({
          shortcutsEnabled: true,
          setShortcutsEnabled() {},
        }),
      },
      "@/features/user-setting/hooks/use-open-user-settings": {
        useOpenUserSettings: () => () => {},
      },
      "@/components/ui/dialog": {
        Dialog: ({ children }) => children,
        DialogContent: ({ children, ...props }) =>
          React.createElement("div", { ...props, role: "dialog" }, children),
        DialogHeader: ({ children, ...props }) =>
          React.createElement("header", props, children),
        DialogTitle: ({ children, ...props }) =>
          React.createElement("h2", props, children),
        DialogDescription: ({ children, ...props }) =>
          React.createElement("p", props, children),
      },
    },
  );

  return renderToStaticMarkup(
    React.createElement(WorkspaceHelpDialog, { open: true, onClose() {} }),
  );
}

test("Help starts with current-page guidance and an explicitly focused search control", () => {
  const markup = renderHelp();
  assert.match(markup, /data-modal-initial-focus/);
  assert.match(markup, /Notebook AI, current page/);
  assert.match(markup, /Help sections/);
  assert.ok(
    markup.indexOf("Research with Notebook AI") <
      markup.indexOf("Find your next task"),
  );
  assert.doesNotMatch(markup, /AI Assistant is coming soon/);
});

test("search combines guide and troubleshooting matches with useful empty recovery", () => {
  const matches = renderHelp({ query: "AI" });
  assert.match(matches, /Matching guides/);
  assert.match(matches, /Matching troubleshooting/);
  assert.match(matches, /results for/);
  const empty = renderHelp({ query: "nonexistent nonsense" });
  assert.match(empty, /No matching help/);
  assert.match(empty, /Reset search and filters/);
});

test("shortcut panel exposes a labeled switch and both operating system displays", () => {
  const markup = renderHelp({ tab: "shortcuts" });
  assert.match(markup, /role="switch"/);
  assert.match(markup, /aria-checked="true"/);
  assert.match(markup, /Windows \/ Linux/);
  assert.match(markup, /macOS/);
  assert.match(markup, /G then C/);
});
