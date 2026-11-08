import { toast } from "sonner";
import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DragEndEvent } from "@dnd-kit/core";
import { DocumentItemType, DocumentRole } from "../types/documents.enums";
import type { DocumentItem } from "../types/documents.types";
import { useDocumentDragAndDrop } from "./useDocumentDragAndDrop";

test("dropping one selected item stages the whole group; blocked targets stage nothing", (context) => {
  const feedback = context.mock.method(toast, "info", () => "toast");
  const source = {
    id: "source",
    type: DocumentItemType.FILE,
    projectId: null,
    parentFolderId: null,
    userRole: DocumentRole.OWNER,
    isArchived: false,
  } as DocumentItem;
  const group = [source, { ...source, id: "second" }];
  const destination = {
    ...source,
    id: "folder",
    name: "Folder",
    type: DocumentItemType.FOLDER,
  };
  const stage = context.mock.fn();
  let handler!: ReturnType<typeof useDocumentDragAndDrop>["handleDragEnd"];
  function Harness() {
    handler = useDocumentDragAndDrop({ onDropItems: stage }).handleDragEnd;

    return null;
  }
  renderToStaticMarkup(<Harness />);
  const event = (folder: DocumentItem, canDrop: boolean) =>
    ({
      active: {
        id: source.id,
        data: { current: { document: source, items: group } },
      },
      over: {
        id: folder.id,
        data: { current: { document: folder, ancestorIds: [], canDrop } },
      },
    }) as unknown as DragEndEvent;
  handler(event(destination, true));
  assert.equal(stage.mock.callCount(), 1);
  assert.deepEqual(stage.mock.calls[0].arguments[0], group);
  assert.equal(feedback.mock.callCount(), 0);
  handler(event(destination, false));
  handler(event({ ...destination, projectId: "project" }, true));
  handler(event({ ...destination, userRole: DocumentRole.VIEWER }, true));
  assert.equal(stage.mock.callCount(), 1);
  assert.equal(feedback.mock.callCount(), 3);
});
