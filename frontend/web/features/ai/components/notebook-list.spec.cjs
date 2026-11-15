const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { createSourceLoader } = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));

test("notebook cards keep navigation and menu actions separate and escape long user titles", () => {
  const { NotebookCard } = load("features/ai/components/notebook-card.tsx", {
    "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
    "@/components/ui/dropdown-menu": {
      DropdownMenu: ({ children }) => children, DropdownMenuTrigger: ({ children }) => children,
      DropdownMenuContent: ({ children }) => children,
      DropdownMenuItem: ({ children, onClick }) => React.createElement("button", { onClick }, children),
      DropdownMenuSeparator: () => null,
    },
  });
  const title = '<script>alert("private")</script>' + "x".repeat(160);
  const html = renderToStaticMarkup(React.createElement(NotebookCard, { notebook: { id: "notebook", title, updated_at: "2026-11-15T00:00:00Z" }, onAction() {} }));
  assert.match(html, /href="\/ai\/notebooks\/notebook"/);
  assert.match(html, /Actions for/);
  assert.match(html, /Rename/);
  assert.match(html, /Delete/);
  assert.ok(!html.includes("<script>"));
  assert.ok(!/<a[^>]*>[\s\S]*?<button[\s\S]*?<\/a>/.test(html), "action buttons cannot be nested in navigation");
});

test("notebook filters reset paging and cache keys isolate accounts and search/sort", () => {
  const { notebookKeys } = load("features/ai/types/notebook-list.ts");
  const state = { page: 7, search: "", sort: "updated_desc" };
  let updated;
  const { useNotebookList } = load("features/ai/hooks/use-notebook-list.ts", {
    react: { ...React, useState: () => [state, value => { updated = typeof value === "function" ? value(state) : value; }] },
    "@tanstack/react-query": { useQuery: () => ({}) },
    "@/features/chat/hooks/useDebouncedValue": { useDebouncedValue: value => value },
    "../api/notebooks.api": { notebooksApi: {} },
  });
  const hook = useNotebookList("owner");
  hook.setSearch("research");
  assert.deepEqual(updated, { page: 1, search: "research", sort: "updated_desc" });
  hook.setSort("title_asc");
  assert.equal(updated.page, 1);
  assert.notDeepEqual(notebookKeys.list("owner", state), notebookKeys.list("other", state));
  assert.notDeepEqual(notebookKeys.list("owner", state), notebookKeys.list("owner", { ...state, search: "research" }));
});
