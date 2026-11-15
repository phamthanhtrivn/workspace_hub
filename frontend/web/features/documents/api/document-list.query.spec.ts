import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { documentListOptions, documentKeys } from "./document-list.query";
import { documentsApi } from "./documents.api";
import { DocumentSortBy, DocumentViewType } from "../types/documents.enums";

const scope = { activeView: DocumentViewType.MY_FILES, currentFolderId: null, sortBy: DocumentSortBy.LATEST, searchQuery: "" };

test("Documents and My Files share in-flight reads and fresh pages; accounts and filters stay isolated", async context => {
  const read = context.mock.method(documentsApi, "getDocuments", async () => ({ data: [], meta: { page: 1, totalPages: 1 } }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    await Promise.all([
      client.fetchInfiniteQuery(documentListOptions("owner", scope)),
      client.fetchInfiniteQuery(documentListOptions("owner", { ...scope })),
    ]);
    await client.fetchInfiniteQuery(documentListOptions("owner", scope));
    assert.equal(read.mock.callCount(), 1);
    await client.invalidateQueries({ queryKey: documentKeys.lists("owner") });
    await client.fetchInfiniteQuery(documentListOptions("owner", scope));
    assert.equal(read.mock.callCount(), 2, "mutation invalidation bypasses freshness");
    await client.fetchInfiniteQuery(documentListOptions("other", scope));
    await client.fetchInfiniteQuery(documentListOptions("owner", { ...scope, searchQuery: "report" }));
    assert.equal(read.mock.callCount(), 4);
    client.clear();
    await client.fetchInfiniteQuery(documentListOptions("owner", scope));
    assert.equal(read.mock.callCount(), 5, "account cache clearing forces a new read");
  } finally { client.clear(); }
});

test("equivalent folder requests share keys but project-starred and personal-starred requests cannot collide", () => {
  const folder = { ...scope, currentFolderId: "folder" };
  assert.deepEqual(documentKeys.list("owner", folder), documentKeys.list("owner", { ...folder, activeView: DocumentViewType.SHARED }));
  assert.notDeepEqual(
    documentKeys.list("owner", { ...folder, activeView: DocumentViewType.STARRED }),
    documentKeys.list("owner", { ...folder, activeView: DocumentViewType.STARRED, projectId: "project" }),
  );
  assert.notDeepEqual(documentKeys.list("owner", scope), documentKeys.list("owner", { ...scope, projectId: "project" }));
});
