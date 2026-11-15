import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { documentKeys } from "../api/document-list.query";
import { DocumentSortBy, DocumentViewType } from "../types/documents.enums";
import { chatDocumentMetadataKey } from "@/features/chat/types/document.constants";
import { invalidateDocumentPermissions, invalidateDocumentShare } from "./document-cache";

test("sharing invalidates only the affected item, containing lists and account", async () => {
  const client = new QueryClient();
  const scope = { activeView: DocumentViewType.MY_FILES, currentFolderId: null, sortBy: DocumentSortBy.LATEST, searchQuery: "" };
  const containing = documentKeys.list("owner", scope);
  const unrelated = documentKeys.list("owner", { ...scope, currentFolderId: "other-folder" });
  const anotherUser = documentKeys.list("another-user", scope);
  const metadata = chatDocumentMetadataKey("owner", "file");
  const otherMetadata = chatDocumentMetadataKey("owner", "other-file");
  try {
    client.setQueryData(containing, { pages: [{ data: [{ id: "file" }] }] });
    client.setQueryData(unrelated, { pages: [{ data: [{ id: "other-file" }] }] });
    client.setQueryData(anotherUser, { pages: [{ data: [{ id: "file" }] }] });
    client.setQueryData(metadata, { hasPermission: true });
    client.setQueryData(otherMetadata, { hasPermission: true });
    await invalidateDocumentShare(client, "owner", "file");
    assert.equal(client.getQueryState(containing)?.isInvalidated, true);
    assert.equal(client.getQueryState(metadata)?.isInvalidated, true);
    assert.equal(client.getQueryState(unrelated)?.isInvalidated, false);
    assert.equal(client.getQueryState(otherMetadata)?.isInvalidated, false);
    assert.equal(client.getQueryState(anotherUser)?.isInvalidated, false);
    client.setQueryData(["document-preview", "file", null], { url: "previous-url" });
    await invalidateDocumentPermissions(client, "owner", "file");
    assert.equal(client.getQueryData(containing), undefined, "permission changes clear cached folder listings");
    assert.equal(client.getQueryData(metadata), undefined);
    assert.equal(client.getQueryData(["document-preview", "file", null]), undefined);
    assert.ok(client.getQueryData(anotherUser));
  } finally { client.clear(); }
});
