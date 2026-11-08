import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentItemType } from "../types/documents.enums";
import {
  isProjectRootFolder,
  resolveDocumentProjectContext,
} from "./project-documents";

test("project folders keep their project scope while browsing from My files", () => {
  const context = resolveDocumentProjectContext({
    folderProjectId: "project",
    path: [
      { id: null, name: "My files" },
      { id: "project-root", name: "GatherTown" },
      { id: "child", name: "Notes" },
    ],
  });
  assert.deepEqual(context, {
    projectId: "project",
    rootFolderId: "project-root",
    rootLabel: "GatherTown",
  });
});

test("explicit project scope remains authoritative in the project Documents tab", () => {
  const context = resolveDocumentProjectContext({
    projectId: "project",
    folderProjectId: "stale-project",
    path: [{ id: "project-root", name: "GatherTown" }],
  });
  assert.equal(context.projectId, "project");
  assert.equal(context.rootFolderId, "project-root");
});

test("personal folders retain their personal root", () => {
  const context = resolveDocumentProjectContext({
    folderProjectId: null,
    path: [
      { id: null, name: "My files" },
      { id: "personal-folder", name: "Personal" },
    ],
  });
  assert.equal(context.projectId, undefined);
  assert.equal(context.rootFolderId, null);
});

test("only project root folders are protected from move and deletion", () => {
  const root = {
    projectId: "project",
    parentFolderId: null,
    type: DocumentItemType.FOLDER,
  };
  assert.equal(isProjectRootFolder(root), true);
  assert.equal(isProjectRootFolder({ ...root, parentFolderId: "root" }), false);
  assert.equal(isProjectRootFolder({ ...root, projectId: null }), false);
  assert.equal(
    isProjectRootFolder({ ...root, type: DocumentItemType.FILE }),
    false,
  );
});
