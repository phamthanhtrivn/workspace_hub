import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
  test(`${Component.name}: selection checkboxes and file names toggle selection without opening files`, (context) => {
    const toggle = context.mock.fn();
    const open = context.mock.fn();
    const noop = () => {};
    let tree: React.ReactNode;
    function Harness() {
      tree = Component({
        item: file,
        selectedItemId: null,
        selection: {
          selectedIds: new Set(["file"]),
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
    renderToStaticMarkup(<Harness />);
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
    name.props.onClick?.({
      stopPropagation() {},
    } as React.MouseEvent<HTMLButtonElement>);
    assert.equal(toggle.mock.callCount(), 2);
    assert.equal(open.mock.callCount(), 0);
  });
}

test("unavailable bulk actions render genuinely disabled buttons and name blocked files", () => {
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
    items,
    allSelected: false,
    loadToken: null,
    requestedAction: null,
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
  };
  const tree = DocumentBulkControls({
    selection,
    activeView: DocumentViewType.MY_FILES,
    currentFolderId: null,
    projectRootFolderId: null,
    onStart: noop,
  });
  const buttons = descendants(tree).filter(
    (element) => element.type === Button,
  ) as React.ReactElement<React.ComponentProps<typeof Button>>[];
  assert.equal(
    buttons.find((button) => button.props.children === "Move")?.props.disabled,
    true,
  );
  assert.equal(
    buttons.find((button) => button.props.children === "Star")?.props.disabled,
    false,
  );
  const move = buttons.find((button) => button.props.children === "Move");
  assert.match(move?.props.title ?? "", /Read only.pdf/);
});
