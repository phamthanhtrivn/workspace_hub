import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ItemActionsMenu } from "./item-actions-menu";
import {
  DocumentItemType,
  DocumentRole,
  DocumentViewType,
} from "../../types/documents.enums";
import type { DocumentItem } from "../../types/documents.types";

const root: DocumentItem = {
  id: "root",
  name: "GatherTown",
  ownerUserId: "owner",
  ownerEmail: "owner@example.test",
  projectId: "project",
  parentFolderId: null,
  type: DocumentItemType.FOLDER,
  mimeType: null,
  s3Key: null,
  sizeBytes: 0,
  isStarred: false,
  isArchived: false,
  archivedAt: null,
  createdAt: "2026-11-08T00:00:00Z",
  updatedAt: "2026-11-08T00:00:00Z",
  userRole: DocumentRole.OWNER,
};

function text(node: React.ReactNode): string {
  return React.Children.toArray(node)
    .map((child) => {
      if (typeof child === "string") return child;
      if (React.isValidElement<{ children?: React.ReactNode }>(child))
        return text(child.props.children);

      return "";
    })
    .join("|");
}

function actions(item: DocumentItem) {
  let labels = "";
  const noop = () => {};
  function Harness() {
    labels = text(
      ItemActionsMenu({
        item,
        activeView: DocumentViewType.MY_FILES,
        activeMenuId: item.id,
        setActiveMenuId: noop,
        onRename: noop,
        onMove: noop,
        onToggleStar: noop,
        onArchive: noop,
        onViewDetails: noop,
        onDownloadFolder: noop,
        onDeletePermanently: noop,
        onShare: noop,
        onShareToChat: noop,
      }),
    );

    return null;
  }
  renderToStaticMarkup(<Harness />);

  return labels.split("|");
}

test("project roots in My files expose project-safe actions", () => {
  const labels = actions(root);
  for (const label of [
    "Move",
    "Move to trash",
    "Delete permanently",
    "Share",
    "Star",
  ])
    assert.equal(labels.includes(label), false, label);
  for (const label of ["Download ZIP", "Details", "Share to chat"])
    assert.equal(labels.includes(label), true, label);
});

test("project child folders keep editable project actions outside the Project tab", () => {
  const labels = actions({
    ...root,
    id: "child",
    parentFolderId: root.id,
    userRole: DocumentRole.EDITOR,
  });
  assert.equal(labels.includes("Move"), true);
  assert.equal(labels.includes("Delete permanently"), true);
  assert.equal(labels.includes("Share"), false);
  assert.equal(labels.includes("Move to trash"), false);
});

test("personal folder actions retain personal sharing and trash", () => {
  const labels = actions({ ...root, projectId: null });
  assert.equal(labels.includes("Share"), true);
  assert.equal(labels.includes("Move to trash"), true);
  assert.equal(labels.includes("Star"), true);
});

test("personal files shared with Viewer/Editor do not expose Share to chat", () => {
  for (const userRole of [DocumentRole.VIEWER, DocumentRole.EDITOR]) {
    const labels = actions({ ...root, projectId: null, userRole });
    assert.equal(labels.includes("Share to chat"), false);
  }
  assert.equal(
    actions({
      ...root,
      projectId: null,
      userRole: DocumentRole.OWNER,
    }).includes("Share to chat"),
    true,
  );
});
