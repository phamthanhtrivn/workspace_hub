import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as dnd from "@dnd-kit/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { store } from "@/store/store";
import { DocumentItemType, DocumentRole } from "../types/documents.enums";
import type { DocumentItem } from "../types/documents.types";
import type { DocumentDropData } from "../types/document-bulk.types";
import { useDocumentBreadcrumbDrop } from "./useDocumentBreadcrumbDrop";

for (const [name, projectId, allowRootDrop, allowed] of [
  ["My files", null, true, true],
  ["Shared", null, false, false],
  ["My files project boundary", "project", true, false],
] as const) {
  test(`${name}: breadcrumb publishes destination data and only allows valid root drops`, (context) => {
    const source = {
      id: "file",
      name: "Report",
      type: DocumentItemType.FILE,
      projectId,
      parentFolderId: "nested",
      userRole: DocumentRole.OWNER,
      isArchived: false,
    } as DocumentItem;
    context.mock.method(
      dnd,
      "useDndContext",
      () =>
        ({
          active: { data: { current: { document: source, items: [source] } } },
        }) as unknown as ReturnType<typeof dnd.useDndContext>,
    );
    let options!: Parameters<typeof dnd.useDroppable>[0];
    context.mock.method(
      dnd,
      "useDroppable",
      (next: Parameters<typeof dnd.useDroppable>[0]) => {
        options = next;

        return {
          setNodeRef() {},
          isOver: false,
          active: null,
          rect: { current: null },
          node: { current: null },
          over: null,
        } satisfies ReturnType<typeof dnd.useDroppable>;
      },
    );
    const client = new QueryClient();
    context.after(() => client.clear());
    const testStore = configureStore({
      reducer: () => ({
        ...store.getState(),
        auth: { ...store.getState().auth, userId: "owner" },
      }),
    });
    function Harness() {
      useDocumentBreadcrumbDrop(null, "My files", allowRootDrop);

      return null;
    }
    renderToStaticMarkup(
      <Provider store={testStore}>
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>
      </Provider>,
    );
    assert.equal(options.disabled, !allowed);
    const data = options.data as DocumentDropData;
    assert.equal(data.document.id, null);
    assert.equal(data.document.name, "My files");
    assert.equal(data.canDrop, allowed);
  });
}
