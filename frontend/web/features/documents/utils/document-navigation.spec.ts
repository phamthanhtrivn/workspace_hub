import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentRole, DocumentViewType } from "../types/documents.enums";
import {
  canonicalizeDocumentFolderQuery,
  getDocumentFolderUrl,
  getDocumentView,
} from "./document-navigation";

test("folder destinations use the effective owner role, including project ownership", () => {
  assert.equal(getDocumentView(DocumentRole.OWNER), DocumentViewType.MY_FILES);
  for (const role of [DocumentRole.EDITOR, DocumentRole.VIEWER])
    assert.equal(getDocumentView(role), DocumentViewType.SHARED);
  assert.equal(
    getDocumentFolderUrl("folder with spaces", DocumentRole.OWNER),
    "/documents?view=MY_FILES&folderId=folder+with+spaces",
  );
});

test("old bookmarks correct My files/Shared while retaining unrelated query parameters", () => {
  const owner = new URLSearchParams(
    canonicalizeDocumentFolderQuery(
      "view=SHARED&folderId=project&search=report",
      DocumentRole.OWNER,
    ),
  );
  assert.equal(owner.get("view"), "MY_FILES");
  assert.equal(owner.get("folderId"), "project");
  assert.equal(owner.get("search"), "report");
  assert.equal(
    new URLSearchParams(
      canonicalizeDocumentFolderQuery(
        "view=MY_FILES&folderId=child",
        DocumentRole.EDITOR,
      ),
    ).get("view"),
    "SHARED",
  );
  assert.equal(
    new URLSearchParams(
      canonicalizeDocumentFolderQuery("folderId=project", DocumentRole.OWNER),
    ).get("view"),
    "MY_FILES",
  );
});

test("explicit Starred/Trash views and root navigation remain unchanged", () => {
  for (const view of ["STARRED", "TRASH"]) {
    const query = `view=${view}&folderId=folder`;
    assert.equal(
      canonicalizeDocumentFolderQuery(query, DocumentRole.OWNER),
      query,
    );
  }
  assert.equal(
    canonicalizeDocumentFolderQuery("view=SHARED", DocumentRole.OWNER),
    "view=SHARED",
  );
});
