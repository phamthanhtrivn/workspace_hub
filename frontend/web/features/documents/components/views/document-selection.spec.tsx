import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { GridViewCard } from "./grid-view-card";
import { ListViewRow } from "./list-view-row";
import {
  DocumentRole,
  DocumentItemType,
  DocumentViewType,
} from "../../types/documents.enums";
import type { DocumentItem } from "../../types/documents.types";
import { DocumentBulkControls } from "../explorer/document-bulk-controls";
import type { DocumentBulkSelection } from "../../hooks/useDocumentBulkSelection";
import {
  DocumentBulkAction,
  type DocumentMultiSelection,
} from "../../types/document-bulk.types";
import * as itemDragAndDrop from "../../hooks/useDocumentItemDragAndDrop";

function descendants(
  node: React.ReactNode,
): React.ReactElement<{ children?: React.ReactNode }>[] {
  return React.Children.toArray(node).flatMap((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child)
      ? [child, ...descendants(child.props.children)]
      : [],
  );
}
const file = {
  id: "file",
  name: "Report.pdf",
  type: DocumentItemType.FILE,
  projectId: null,
  parentFolderId: null,
  userRole: DocumentRole.OWNER,
  isArchived: false,
  sizeBytes: 1,
} as DocumentItem;

for (const Component of [GridViewCard, ListViewRow]) {
  test(`${Component.name}: Move selection supports dragging from file names and checkbox clicks`, (context) => {
    const pointerDown = context.mock.fn();
    const originalDragHook = itemDragAndDrop.useDocumentItemDragAndDrop;
    context.mock.method(
      itemDragAndDrop,
      "useDocumentItemDragAndDrop",
      (item: DocumentItem, selection?: DocumentMultiSelection) => {
        const drag = originalDragHook(item, selection);
        assert.ok(
          drag.listeners,
          "selected Move items must keep drag listeners enabled",
        );

        return {
          ...drag,
          listeners: { ...drag.listeners, onPointerDown: pointerDown },
        };
      },
    );
    const client = new QueryClient();
    context.after(() => client.clear());
    const toggle = context.mock.fn();
    const open = context.mock.fn();
    const noop = () => {};
    let tree: React.ReactNode;
    function Harness() {
      tree = Component({
        item: file,
        selectedItemId: null,
        selection: {
          action: DocumentBulkAction.MOVE,
          items: [file, { ...file, id: "second" }],
          selectedIds: new Set(["file", "second"]),
          onToggle: toggle,
          disabled: false,
        },
        activeView: DocumentViewType.MY_FILES,
        activeMenuId: null,
        onSelect: noop,
        onFolderClick: open,
        setActiveMenuId: noop,
        onRename: noop,
        onMove: noop,
        onMoveToTrash: noop,
        onRestore: noop,
        onViewDetails: noop,
        onDeletePermanently: noop,
        onPreview: open,
      });

      return null;
    }
    renderToStaticMarkup(
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>
      </Provider>,
    );
    const elements = descendants(tree);
    const checkbox = elements.find((element) => element.type === Checkbox) as
      React.ReactElement<React.ComponentProps<typeof Checkbox>> | undefined;
    assert.ok(checkbox);
    assert.equal(checkbox.props.checked, true);
    checkbox.props.onCheckedChange?.(false);
    const name = elements.find(
      (element) =>
        element.type === Button && element.props.children === file.name,
    ) as React.ReactElement<React.ComponentProps<typeof Button>> | undefined;
    assert.ok(name);
    name.props.onPointerDown?.({
      stopPropagation() {},
    } as React.PointerEvent<HTMLButtonElement>);
    assert.equal(pointerDown.mock.callCount(), 1);
    assert.equal(
      toggle.mock.callCount(),
      1,
      "starting a drag must not toggle selection",
    );
    name.props.onClick?.({
      stopPropagation() {},
    } as React.MouseEvent<HTMLButtonElement>);
    assert.equal(toggle.mock.callCount(), 2);
    assert.equal(open.mock.callCount(), 0);
  });
}

test("unavailable bulk actions remain clickable for feedback and name blocked files", () => {
  const noop = () => {};
  const items = [
    file,
    {
      ...file,
      id: "viewer",
      name: "Read only.pdf",
      userRole: DocumentRole.VIEWER,
    },
  ];
  const selection: DocumentBulkSelection = {
    scopeKey: "scope",
    active: true,
    action: DocumentBulkAction.MOVE,
    items,
    allSelected: false,
    loadToken: null,
    requestedAction: null,
    dropDestination: null,
    dropFromSelection: false,
    selectedIds: new Set(items.map((item) => item.id)),
    busy: false,
    selectAll: () => Promise.resolve(),
    start: noop,
    cancel: noop,
    clear: noop,
    toggle: noop,
    requestAction: noop,
    closeAction: noop,
    execute: noop,
    getDisabledReason: () => undefined,
    requestDrop: noop,
  };
  const tree = DocumentBulkControls({
    selection,
    currentFolderId: null,
    projectRootFolderId: null,
  });
  const buttons = descendants(tree).filter(
    (element) => element.type === Button,
  ) as React.ReactElement<React.ComponentProps<typeof Button>>[];
  assert.equal(
    buttons.find((button) => button.props.children === "Continue")?.props
      .disabled,
    false,
  );
  assert.equal(
    buttons.find((button) => button.props.children === "Star"),
    undefined,
  );
  const move = buttons.find((button) => button.props.children === "Continue");
  assert.match(move?.props.title ?? "", /Read only.pdf/);
});

for (const Component of [GridViewCard, ListViewRow]) {
  test(
    Component.name +
      ": project roots stay visible without selection checkboxes",
    () => {
      const client = new QueryClient();
      const root = {
        ...file,
        id: "project-root",
        name: "GatherTown",
        type: DocumentItemType.FOLDER,
        projectId: "project",
      };
      const noop = () => {};
      let tree: React.ReactNode;
      function Harness() {
        tree = Component({
          item: root,
          selectedItemId: null,
          selection: {
            action: DocumentBulkAction.MOVE,
            selectedIds: new Set(),
            onToggle: noop,
            disabled: false,
            getDisabledReason: () => "Project root",
          },
          activeView: DocumentViewType.MY_FILES,
          activeMenuId: null,
          onSelect: noop,
          onFolderClick: noop,
          setActiveMenuId: noop,
          onRename: noop,
          onMove: noop,
          onMoveToTrash: noop,
          onRestore: noop,
          onViewDetails: noop,
          onDeletePermanently: noop,
        });

        return null;
      }
      try {
        renderToStaticMarkup(
          <Provider store={store}>
            <QueryClientProvider client={client}>
              <Harness />
            </QueryClientProvider>
          </Provider>,
        );
        const elements = descendants(tree);
        assert.equal(
          elements.some((element) => element.type === Checkbox),
          false,
        );
        assert.equal(
          elements.some((element) =>
            /opacity-40/.test(
              (element.props as { className?: string }).className ?? "",
            ),
          ),
          false,
        );
        const icon = elements.find(
          (element) =>
            element.type === Button &&
            (element.props as { "aria-label"?: string })["aria-label"] ===
              "Select GatherTown",
        );
        assert.equal((icon?.props as { disabled?: boolean }).disabled, false);
      } finally {
        client.clear();
      }
    },
  );
}
