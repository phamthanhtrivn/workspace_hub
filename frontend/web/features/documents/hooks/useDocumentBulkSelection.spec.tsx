import { toast } from "sonner";
import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "@/store/store";
import { documentsApi } from "../api/documents.api";
import {
  DocumentBulkAction as Action,
  type DocumentBulkRequest,
} from "../types/document-bulk.types";
import {
  DocumentItemType,
  DocumentRole,
  DocumentSortBy,
  DocumentViewType,
} from "../types/documents.enums";
import type { DocumentItem } from "../types/documents.types";
import { useDocumentBulkSelection } from "./useDocumentBulkSelection";
import type { DocumentListScope } from "../api/document-list.api";

const file = {
  id: "file",
  name: "Report.pdf",
  type: DocumentItemType.FILE,
  projectId: null,
  parentFolderId: "source",
  userRole: DocumentRole.OWNER,
  isArchived: false,
} as DocumentItem;
const folder = {
  ...file,
  id: "destination",
  name: "Destination",
  type: DocumentItemType.FOLDER,
};

function setup(context: TestContext, scope: Partial<DocumentListScope> = {}) {
  const client = new QueryClient();
  context.after(() => client.clear());
  const testStore = configureStore({
    reducer: () => ({
      ...store.getState(),
      auth: { ...store.getState().auth, userId: "owner" },
    }),
  });
  let state: unknown;
  const useState = React.useState;
  context.mock.method(React, "useState", ((initial: unknown) => {
    if (!initial || typeof initial !== "object" || !("scopeKey" in initial))
      return useState(initial);
    state ??= initial;

    return [
      state,
      (next: unknown) => {
        state = typeof next === "function" ? next(state) : next;
      },
    ];
  }) as typeof React.useState);
  let selection!: ReturnType<typeof useDocumentBulkSelection>;
  function Harness() {
    selection = useDocumentBulkSelection({
      activeView: DocumentViewType.MY_FILES,
      currentFolderId: null,
      searchQuery: "",
      sortBy: DocumentSortBy.LATEST,
      ...scope,
    });

    return null;
  }
  const request = context.mock.method(
    documentsApi,
    "bulkAction",
    async (request: DocumentBulkRequest) => ({ count: request.ids.length }),
  );

  return {
    request,
    render: () => {
      renderToStaticMarkup(
        <Provider store={testStore}>
          <QueryClientProvider client={client}>
            <Harness />
          </QueryClientProvider>
        </Provider>,
      );

      return selection;
    },
  };
}

test("choosing an action and ticking files never writes before explicit confirmation", (context) => {
  const h = setup(context);
  h.render().start(Action.MOVE, file);
  let selection = h.render();
  assert.equal(selection.active, true);
  assert.equal(selection.action, Action.MOVE);
  assert.equal(selection.requestedAction, null);
  assert.equal(h.request.mock.callCount(), 0);
  selection.toggle({ ...file, id: "second" });
  selection = h.render();
  assert.equal(selection.items.length, 2);
  selection.requestAction();
  assert.equal(h.render().requestedAction, Action.MOVE);
  assert.equal(h.request.mock.callCount(), 0);
  h.render().cancel();
  assert.equal(h.render().active, false);
});

test("readonly items cannot be manually checked for Move", (context) => {
  const feedback = context.mock.method(toast, "info", () => "toast");
  const h = setup(context);
  h.render().start(Action.MOVE);
  h.render().toggle({ ...file, userRole: DocumentRole.VIEWER });
  assert.equal(feedback.mock.callCount(), 1);
  assert.equal(h.request.mock.callCount(), 0);
  assert.equal(h.render().items.length, 0);
  assert.ok(
    h.render().getDisabledReason({ ...file, userRole: DocumentRole.VIEWER }),
  );
});

test("Select all fetches every page but skips project root folders", async (context) => {
  const projectRoot = {
    ...folder,
    id: "project-root",
    projectId: "project",
    parentFolderId: null,
  };
  const personalFolder = { ...folder, id: "personal-folder" };
  const pages = context.mock.method(
    documentsApi,
    "getDocuments",
    async (params?: Parameters<typeof documentsApi.getDocuments>[0]) => ({
      data: params?.page === 2 ? [personalFolder] : [file, projectRoot],
      meta: { totalItems: 3, page: params?.page ?? 1, limit: 2, totalPages: 2 },
    }),
  );
  const h = setup(context);
  h.render().start(Action.MOVE);
  await h.render().selectAll();
  const selection = h.render();
  assert.equal(pages.mock.callCount(), 2);
  assert.deepEqual(
    selection.items.map((item) => item.id),
    ["file", "personal-folder"],
  );
  assert.equal(selection.selectedIds.has("project-root"), false);
  assert.equal(selection.allSelected, true);
  selection.requestAction();
  assert.equal(
    h.render().requestedAction,
    Action.MOVE,
    "Continue remains available for the valid selection",
  );
});

test("Select all still includes editable child folders within a project", async (context) => {
  const child = {
    ...folder,
    id: "project-child",
    projectId: "project",
    parentFolderId: "project-root",
    userRole: DocumentRole.EDITOR,
  };
  context.mock.method(documentsApi, "getDocuments", async () => ({
    data: [child],
    meta: { totalItems: 1, page: 1, limit: 12, totalPages: 1 },
  }));
  const h = setup(context, {
    projectId: "project",
    currentFolderId: "project-root",
  });
  h.render().start(Action.MOVE);
  await h.render().selectAll();
  assert.deepEqual(
    h.render().items.map((item) => item.id),
    ["project-child"],
  );
});

test("Select all stays unchecked when the only results are project root folders", async (context) => {
  context.mock.method(documentsApi, "getDocuments", async () => ({
    data: [
      {
        ...folder,
        id: "project-root",
        projectId: "project",
        parentFolderId: null,
      },
    ],
    meta: { totalItems: 1, page: 1, limit: 12, totalPages: 1 },
  }));
  const h = setup(context);
  h.render().start(Action.MOVE);
  await h.render().selectAll();
  assert.equal(h.render().items.length, 0);
  assert.equal(h.render().allSelected, false);
});

test("Star executes only after the selected-items action is pressed and then restores the toolbar", async (context) => {
  const h = setup(context);
  h.render().start(Action.STAR, file);
  assert.equal(h.request.mock.callCount(), 0);
  h.render().requestAction();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(h.request.mock.callCount(), 1);
  assert.equal(h.request.mock.calls[0].arguments[0].action, Action.STAR);
  assert.equal(h.render().active, false);
});

test("dropping a selected group stages one confirmation and moves only after confirming", async (context) => {
  const h = setup(context);
  const group = [file, { ...file, id: "second" }];
  h.render().start(Action.MOVE, file);
  h.render().toggle(group[1]);
  h.render().requestDrop(group, folder);
  let selection = h.render();
  assert.equal(selection.dropDestination?.id, folder.id);
  assert.equal(selection.items.length, 2);
  assert.equal(h.request.mock.callCount(), 0);
  selection.execute();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(h.request.mock.callCount(), 1);
  assert.deepEqual(h.request.mock.calls[0].arguments[0].ids, [
    "file",
    "second",
  ]);
  assert.equal(h.request.mock.calls[0].arguments[0].parentFolderId, folder.id);
  selection = h.render();
  assert.equal(selection.active, false);
});

test("canceling an ordinary drop restores the toolbar and performs no mutation", (context) => {
  const h = setup(context);
  h.render().requestDrop([file], folder);
  assert.equal(h.render().active, true);
  h.render().closeAction();
  assert.equal(h.render().active, false);
  assert.equal(h.request.mock.callCount(), 0);
});

test("dropping onto My files sends an explicit null parent after confirmation", async (context) => {
  const h = setup(context);
  h.render().requestDrop([file], {
    ...folder,
    id: null,
    name: "My files",
    parentFolderId: null,
  });
  assert.equal(h.render().dropDestination?.id, null);
  assert.equal(h.request.mock.callCount(), 0);
  h.render().execute();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(h.request.mock.calls[0].arguments[0].parentFolderId, null);
  assert.equal(h.render().active, false);
});

test("Star selection does not accept a drag Move", (context) => {
  const h = setup(context);
  h.render().start(Action.STAR, file);
  h.render().requestDrop([file], folder);
  assert.equal(h.render().dropDestination, null);
  assert.equal(h.render().action, Action.STAR);
});

test("denied actions report feedback without selecting or writing", async (context) => {
  const feedback = context.mock.method(toast, "info", () => "toast");
  const h = setup(context);
  const viewer = { ...file, userRole: DocumentRole.VIEWER };
  h.render().start(Action.MOVE, viewer);
  assert.equal(h.render().active, false);
  h.render().start(Action.MOVE);
  h.render().toggle({ ...folder, projectId: "project", parentFolderId: null });
  assert.equal(h.render().items.length, 0);
  h.render().requestAction();
  h.render().requestDrop([file], { ...folder, userRole: DocumentRole.VIEWER });
  assert.equal(h.render().requestedAction, null);
  assert.equal(h.render().dropDestination, null);
  assert.equal(h.request.mock.callCount(), 0);
  assert.equal(feedback.mock.callCount(), 4);
});

test("Continue reports mixed selection permissions without opening Move or mutating", async (context) => {
  const feedback = context.mock.method(toast, "info", () => "toast");
  context.mock.method(documentsApi, "getDocuments", async () => ({
    data: [file, { ...file, id: "viewer", userRole: DocumentRole.VIEWER }],
    meta: { totalItems: 2, totalPages: 1, page: 1, limit: 50 },
  }));
  const h = setup(context);
  h.render().start(Action.MOVE);
  await h.render().selectAll();
  assert.equal(h.render().items.length, 2);
  h.render().requestAction();
  assert.equal(feedback.mock.callCount(), 1);
  assert.equal(h.render().requestedAction, null);
  assert.equal(h.request.mock.callCount(), 0);
});
