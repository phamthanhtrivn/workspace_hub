const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));

test("notebook cards keep navigation and menu actions separate and escape long user titles", () => {
  const { NotebookCard } = load("features/ai/components/notebook-card.tsx", {
    "next/link": {
      __esModule: true,
      default: ({ children, ...props }) =>
        React.createElement("a", props, children),
    },
    "@/components/ui/dropdown-menu": {
      DropdownMenu: ({ children }) => children,
      DropdownMenuTrigger: ({ children }) => children,
      DropdownMenuContent: ({ children }) => children,
      DropdownMenuItem: ({ children, onClick }) =>
        React.createElement("button", { onClick }, children),
      DropdownMenuSeparator: () => null,
    },
  });
  const title = '<script>alert("private")</script>' + "x".repeat(160);
  const html = renderToStaticMarkup(
    React.createElement(NotebookCard, {
      notebook: {
        id: "notebook",
        title,
        updated_at: "2026-11-15T00:00:00Z",
        description: "Interview findings",
        category: "Academic",
        color_theme: "emerald",
        sources_count: 2,
        notes_count: 4,
      },
      onAction() {},
    }),
  );
  assert.match(html, /href="\/ai\/notebooks\/notebook"/);
  assert.match(html, /Actions for/);
  assert.match(html, /Edit details/);
  for (const value of [
    "Interview findings",
    "Academic",
    "2 sources",
    "4 notes",
  ])
    assert.ok(html.includes(value), value);
  assert.match(html, /Delete/);
  assert.ok(!html.includes("<script>"));
  assert.ok(
    !/<a[^>]*>[\s\S]*?<button[\s\S]*?<\/a>/.test(html),
    "action buttons cannot be nested in navigation",
  );
});

test("notebook filters reset paging and cache keys isolate accounts and search/sort", () => {
  const { notebookKeys } = load("features/ai/types/notebook-list.ts");
  const state = { page: 7, search: "", sort: "updated_desc" };
  let updated;
  const { useNotebookList } = load("features/ai/hooks/use-notebook-list.ts", {
    react: {
      ...React,
      useState: () => [
        state,
        (value) => {
          updated = typeof value === "function" ? value(state) : value;
        },
      ],
    },
    "@tanstack/react-query": { useQuery: () => ({}) },
    "@/features/chat/hooks/useDebouncedValue": {
      useDebouncedValue: (value) => value,
    },
    "../api/notebooks.api": { notebooksApi: {} },
  });
  const hook = useNotebookList("owner");
  hook.setSearch("research");
  assert.deepEqual(updated, {
    page: 1,
    search: "research",
    sort: "updated_desc",
  });
  hook.setSort("title_asc");
  assert.equal(updated.page, 1);
  assert.notDeepEqual(
    notebookKeys.list("owner", state),
    notebookKeys.list("other", state),
  );
  assert.notDeepEqual(
    notebookKeys.list("owner", state),
    notebookKeys.list("owner", { ...state, search: "research" }),
  );
});

test("notebook API parses real counts and persists metadata for create and edit", async () => {
  const writes = [];
  const input = {
    title: "Research",
    description: "Interview findings",
    category: "Academic",
    color_theme: "ocean",
  };
  const { notebooksApi } = load("features/ai/api/notebooks.api.ts", {
    "@/lib/axios": {
      api: {
        post: async (url, body) => {
          writes.push({ url, body });

          return { data: { data: { id: "new" } } };
        },
        patch: async (url, body) => {
          writes.push({ url, body });
        },
        get: async () => ({
          data: {
            data: [
              {
                id: "one",
                ...input,
                updated_at: "2026-11-24",
                sources_count: 3,
                notes_count: 8,
              },
            ],
            meta: {
              page: 1,
              limit: 12,
              total: 1,
              totalPages: 1,
              totalNotebooks: 9,
            },
          },
        }),
      },
    },
  });
  assert.equal((await notebooksApi.create(input)).id, "new");
  await notebooksApi.update("one", input);
  assert.deepEqual(writes, [
    { url: "/api/ai/notebooks", body: input },
    { url: "/api/ai/notebooks/one", body: input },
  ]);
  const result = await notebooksApi.page({
    page: 1,
    search: "",
    sort: "updated_desc",
  });
  assert.deepEqual(
    [
      result.data[0].sources_count,
      result.data[0].notes_count,
      result.meta.totalNotebooks,
    ],
    [3, 8, 9],
  );
});

test("edit dialog retains notebook description, category and accent in the save payload", async () => {
  let mutation;
  let saved;
  const notebook = { id: "one", title: "Research", description: "Methodology", category: "Academic", color_theme: "emerald" };
  const { NotebookDialog } = load("features/ai/components/notebook-dialog.tsx", {
    react: { ...React, useId: () => "metadata-form", useState: (initial) => [initial, () => {}], useRef: (value) => ({ current: value }) },
    "next/navigation": { useRouter: () => ({ push() {} }) },
    "@tanstack/react-query": { useQueryClient: () => ({}), useMutation: (options) => { mutation = options; return {}; } },
    "@/store/store": { store: { getState: () => ({ auth: { userId: "owner" } }) } },
    "../api/notebooks.api": { notebooksApi: { update: async (id, input) => { saved = { id, input }; } } },
  });
  NotebookDialog({ userId: "owner", action: { type: "rename", notebook }, onClose() {} });
  await mutation.mutationFn();
  assert.deepEqual(saved, { id: "one", input: { title: "Research", description: "Methodology", category: "Academic", color_theme: "emerald" } });
});

test("library switches layouts without changing filters, pagination or notebook actions", () => {
  let view = "grid";
  const actions = [];
  let hookIndex = 0;
  const { NotebookList } = load("features/ai/components/notebook-list.tsx", {
    react: {
      ...React,
      useState: () =>
        hookIndex++ % 2 === 0
          ? [null, (action) => actions.push(action)]
          : [
              view,
              (next) => {
                view = next;
              },
            ],
    },
    "@/store/store": { useAppSelector: () => "owner" },
    "../hooks/use-notebook-list": {
      useNotebookList: () => ({
        query: {
          data: {
            data: [{ id: "one", title: "Research" }],
            meta: {
              page: 2,
              limit: 12,
              total: 14,
              totalPages: 2,
              totalNotebooks: 14,
            },
          },
        },
        filters: { search: "", sort: "updated_desc" },
        setSearch() {},
        setSort() {},
        setPage() {},
        clear() {},
        hasFilters: false,
      }),
    },
  });
  function find(element, name) {
    if (!element || typeof element !== "object") return null;
    if (element.type?.name === name) return element;

    return React.Children.toArray(element.props?.children)
      .map((child) => find(child, name))
      .find(Boolean);
  }
  const root = NotebookList();
  const library = () => {
    hookIndex = 0;

    return root.type(root.props);
  };
  const grid = library();
  assert.equal(find(grid, "NotebookCard").props.view, "grid");
  find(grid, "CreateNotebookCard").props.onClick();
  assert.deepEqual(actions, [{ type: "create" }]);
  find(grid, "CollectionViewToggle").props.onChange("list");
  const list = library();
  assert.equal(find(list, "NotebookCard").props.view, "list");
  assert.equal(find(list, "CreateNotebookCard"), undefined);
  assert.equal(find(list, "CollectionPagination").props.page, 2);
});
