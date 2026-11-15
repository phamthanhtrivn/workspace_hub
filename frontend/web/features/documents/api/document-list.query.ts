import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  getDocumentListPage,
  type DocumentListScope,
} from "./document-list.api";
import { DocumentViewType } from "../types/documents.enums";

export const DOCUMENT_READ_POLICY = {
  staleTime: 30_000,
  gcTime: 300_000,
} as const;

export const documentKeys = {
  lists: (userId: string | null | undefined) =>
    ["documents", "list", userId] as const,
  list: (userId: string | null | undefined, scope: DocumentListScope) =>
    [
      ...documentKeys.lists(userId),
      {
        folderId: scope.currentFolderId,
        projectId: scope.currentFolderId ? null : (scope.projectId ?? null),
        view: scope.currentFolderId
          ? scope.activeView === DocumentViewType.STARRED && !scope.projectId
            ? DocumentViewType.STARRED
            : DocumentViewType.MY_FILES
          : scope.activeView,
        sortBy: scope.sortBy,
        search: scope.searchQuery,
      },
    ] as const,
};

export function documentListOptions(
  userId: string | null | undefined,
  scope: DocumentListScope,
) {
  return infiniteQueryOptions({
    queryKey: documentKeys.list(userId, scope),
    ...DOCUMENT_READ_POLICY,
    enabled: !!userId,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getDocumentListPage(scope, pageParam, signal),
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
  });
}
