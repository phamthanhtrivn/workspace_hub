import { documentsApi } from "./documents.api";
import { DocumentViewType, DocumentSortBy } from "../types/documents.enums";
import { ITEMS_PER_PAGE } from "../types/documents.constants";
import type { DocumentItem, PaginatedResponse } from "../types/documents.types";

export interface DocumentListScope {
  activeView: DocumentViewType;
  currentFolderId: string | null;
  projectId?: string;
  sortBy: DocumentSortBy;
  searchQuery: string;
}

export function getDocumentListPage(scope: DocumentListScope, page: number) {
  const common = {
    page,
    limit: ITEMS_PER_PAGE,
    sortBy: scope.sortBy,
    search: scope.searchQuery || undefined,
  };
  if (scope.currentFolderId)
    return documentsApi.getDocuments({
      ...common,
      folderId: scope.currentFolderId,
    });
  if (scope.activeView === DocumentViewType.SHARED)
    return documentsApi.getSharedDocuments(common);

  return documentsApi.getDocuments({
    ...common,
    projectId: scope.projectId,
    starred:
      (!scope.projectId && scope.activeView === DocumentViewType.STARRED) ||
      undefined,
    archived: scope.activeView === DocumentViewType.TRASH || undefined,
  });
}

export async function collectDocumentSelection(
  loadPage: (page: number) => Promise<PaginatedResponse<DocumentItem[]>>,
): Promise<DocumentItem[]> {
  const selected = new Map<string, DocumentItem>();
  let page = 1;
  let totalPages = 1;
  do {
    const response = await loadPage(page);
    if (!response.meta || !Number.isFinite(response.meta.totalPages))
      throw new Error("Invalid document pagination");
    for (const item of response.data) selected.set(item.id, item);
    totalPages = response.meta.totalPages;
    page++;
  } while (page <= totalPages);

  return [...selected.values()];
}
