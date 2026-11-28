import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentRole, DocumentViewType } from "../types/documents.enums";
import {
  canonicalizeDocumentFolderQuery,
  getDocumentFolderUrl,
  getDocumentView,
  getDocumentViewUrl,
  parseDocumentView,
} from "./document-navigation";

test("folder destinations use the effective owner role, including project ownership", () => {
  assert.equal(getDocumentView(DocumentRole.OWNER), DocumentViewType.MY_FILES);
  for (const role of [DocumentRole.EDITOR, DocumentRole.VIEWER])
    assert.equal(getDocumentView(role), DocumentViewType.SHARED);
  assert.equal(
    getDocumentFolderUrl("folder with spaces", DocumentRole.OWNER),
    "/documents?folderId=folder+with+spaces",
  );
});

test("old bookmarks correct My files/Shared while retaining unrelated query parameters", () => {
  const owner = new URLSearchParams(
    canonicalizeDocumentFolderQuery(
      "view=SHARED&folderId=project&search=report",
      DocumentRole.OWNER,
    ),
  );
  assert.equal(owner.get("view"), null);
  assert.equal(owner.get("folderId"), "project");
  assert.equal(owner.get("search"), "report");
  assert.equal(
    new URLSearchParams(
      canonicalizeDocumentFolderQuery(
        "view=MY_FILES&folderId=child",
        DocumentRole.EDITOR,
      ),
    ).get("view"),
    "shared",
  );
  assert.equal(
    new URLSearchParams(
      canonicalizeDocumentFolderQuery("folderId=project", DocumentRole.OWNER),
    ).get("view"),
    null,
  );
});

test("explicit Starred/Trash scopes remain intact while legacy URLs normalize to lowercase", () => {
  for (const view of ["STARRED", "TRASH"]) {
    const query = `view=${view}&folderId=folder`;
    assert.equal(
      canonicalizeDocumentFolderQuery(query, DocumentRole.OWNER),
      `view=${view.toLowerCase()}&folderId=folder`,
    );
  }
  assert.equal(
    canonicalizeDocumentFolderQuery("view=SHARED", DocumentRole.OWNER),
    "view=shared",
  );
});

test("all four document tabs round-trip through their canonical URLs and legacy shared links remain valid", () => {
  const destinations = [
    [DocumentViewType.MY_FILES, "/documents"],
    [DocumentViewType.SHARED, "/documents?view=shared"],
    [DocumentViewType.STARRED, "/documents?view=starred"],
    [DocumentViewType.TRASH, "/documents?view=trash"],
  ] as const;
  for (const [view, url] of destinations) {
    assert.equal(getDocumentViewUrl(view), url);
    assert.equal(parseDocumentView(new URL(url, "https://example.test").searchParams.get("view")), view);
    assert.equal(parseDocumentView(view), view);
  }
  assert.equal(parseDocumentView("shared"), DocumentViewType.SHARED);
  assert.equal(parseDocumentView("unknown"), DocumentViewType.MY_FILES);
  assert.equal(canonicalizeDocumentFolderQuery("view=SHARED&documentId=file"), "view=shared&documentId=file");
});
