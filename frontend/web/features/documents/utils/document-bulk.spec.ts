import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentRole, DocumentItemType } from "../types/documents.enums";
import { DocumentBulkAction as Action } from "../types/document-bulk.types";
import type { DocumentItem } from "../types/documents.types";
import {
  getBulkBlockers,
  getMoveDestinationBlockReason,
} from "./document-bulk";

const file = {
  id: "file",
  name: "report.pdf",
  projectId: null,
  parentFolderId: null,
  userRole: DocumentRole.OWNER,
  isArchived: false,
  type: DocumentItemType.FILE,
} as DocumentItem;

test("mixed permissions disable the whole action and identify the exact item to deselect", () => {
  const viewer = {
    ...file,
    id: "shared",
    name: "Shared report.pdf",
    userRole: DocumentRole.VIEWER,
  };
  assert.deepEqual(
    getBulkBlockers([file, viewer], Action.TRASH).map((item) => item.name),
    ["Shared report.pdf"],
  );
  assert.equal(getBulkBlockers([file, viewer], Action.STAR).length, 0);
});

test("project roots, read-only documents, and mixed project moves are blocked", () => {
  const root = { ...file, type: DocumentItemType.FOLDER, projectId: "project" };
  for (const action of Object.values(Action))
    assert.equal(getBulkBlockers([root], action).length, 1);
  const child = {
    ...root,
    parentFolderId: "root",
    userRole: DocumentRole.EDITOR,
  };
  assert.equal(getBulkBlockers([child], Action.MOVE).length, 0);
  assert.equal(getBulkBlockers([file, child], Action.MOVE).length, 2);
  assert.equal(
    getBulkBlockers([{ ...child, userRole: DocumentRole.VIEWER }], Action.MOVE)
      .length,
    1,
  );
});

test("Move destinations reject project boundaries, read-only and selected folders before clicking", () => {
  const folder = { ...file, id: "folder", type: DocumentItemType.FOLDER };
  assert.equal(getMoveDestinationBlockReason(folder), undefined);
  assert.ok(getMoveDestinationBlockReason({ ...folder, projectId: "project" }));
  assert.ok(
    getMoveDestinationBlockReason({ ...folder, userRole: DocumentRole.VIEWER }),
  );
  assert.ok(getMoveDestinationBlockReason(folder, undefined, ["folder"]));
  assert.equal(
    getMoveDestinationBlockReason(
      { ...folder, projectId: "project" },
      "project",
    ),
    undefined,
  );
  assert.ok(
    getMoveDestinationBlockReason({ ...folder, projectId: "other" }, "project"),
  );
});

test("Trash exposes restore/delete while active personal files must be trashed first", () => {
  assert.equal(getBulkBlockers([file], Action.DELETE).length, 1);
  assert.equal(
    getBulkBlockers([{ ...file, isArchived: true }], Action.DELETE).length,
    0,
  );
  assert.equal(getBulkBlockers([file], Action.RESTORE).length, 1);
  assert.equal(
    getBulkBlockers([{ ...file, isArchived: true }], Action.MOVE).length,
    1,
  );
});
