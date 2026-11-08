import { documentsApi } from "./documents.api";
import { DocumentViewType, DocumentSortBy } from "../types/documents.enums";
import { ITEMS_PER_PAGE } from "../types/documents.constants";
import type { DocumentItem, PaginatedResponse } from "../types/documents.types";
import { DOCUMENT_BULK_MESSAGES } from "../types/document-bulk.types";

export interface DocumentListScope {
  activeView: DocumentViewType;
  currentFolderId: string | null;
  projectId?: string;
  sortBy: DocumentSortBy;
  searchQuery: string;
}

export function getDocumentListPage(
  scope: DocumentListScope,
  page: number,
  signal?: AbortSignal,
) {
  const common = {
    page,
    limit: ITEMS_PER_PAGE,
    sortBy: scope.sortBy,
    search: scope.searchQuery || undefined,
  };
  if (scope.currentFolderId)
    return documentsApi.getDocuments(
      {
        ...common,
        folderId: scope.currentFolderId,
      },
      signal,
    );
  if (scope.activeView === DocumentViewType.SHARED)
    return documentsApi.getSharedDocuments(common, signal);

  return documentsApi.getDocuments(
    {
      ...common,
      projectId: scope.projectId,
      starred:
        (!scope.projectId && scope.activeView === DocumentViewType.STARRED) ||
        undefined,
      archived: scope.activeView === DocumentViewType.TRASH || undefined,
    },
    signal,
  );
}

export async function collectDocumentSelection(
  loadPage: (page: number) => Promise<PaginatedResponse<DocumentItem[]>>,
  signal?: AbortSignal,
): Promise<DocumentItem[]> {
  const selected = new Map<string, DocumentItem>();
  let page = 1;
  let totalPages = 1;
  let expectedCount = 0;
  do {
    signal?.throwIfAborted();
    const response = await loadPage(page);
    if (!response.meta || !Number.isFinite(response.meta.totalPages))
      throw new Error(DOCUMENT_BULK_MESSAGES.INVALID_PAGINATION);
    for (const item of response.data) selected.set(item.id, item);
    totalPages = response.meta.totalPages;
    expectedCount = response.meta.totalItems;
    page++;
  } while (page <= totalPages);
  signal?.throwIfAborted();
  if (selected.size !== expectedCount)
    throw new Error(DOCUMENT_BULK_MESSAGES.SELECTION_CHANGED);

  return [...selected.values()];
}
