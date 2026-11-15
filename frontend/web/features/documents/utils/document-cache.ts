import type { QueryClient } from "@tanstack/react-query";
import { chatDocumentMetadataKey } from "@/features/chat/types/document.constants";
import { documentKeys } from "../api/document-list.query";
import { documentFolderAccessKey } from "./document-navigation";
import { filePickerKey } from "../api/file-copy.api";

export function invalidateDocumentShare(
  client: QueryClient,
  userId: string,
  documentId: string,
) {
  // Granting access does not change every document list or folder breadcrumb.
  return Promise.allSettled([
    client.invalidateQueries(
      { queryKey: ["document-sharing", documentId] },
      { cancelRefetch: false },
    ),
    client.invalidateQueries(
      { queryKey: chatDocumentMetadataKey(userId, documentId) },
      { cancelRefetch: false },
    ),
    client.invalidateQueries(
      {
        queryKey: documentKeys.lists(userId),
        predicate: (query) => {
          const cached = query.state.data as
            { pages?: { data?: { id: string }[] }[] } | undefined;

          return !!cached?.pages?.some((page) =>
            page.data?.some((document) => document.id === documentId),
          );
        },
      },
      { cancelRefetch: false },
    ),
  ]);
}

export function invalidateDocumentPermissions(
  client: QueryClient,
  userId: string,
  documentId?: string,
) {
  const requests: Promise<unknown>[] = [
    client.resetQueries(
      { queryKey: filePickerKey(userId) },
      { cancelRefetch: false },
    ),
    // Folder permissions can affect descendants not present in the event payload.
    client.resetQueries(
      { queryKey: documentKeys.lists(userId) },
      { cancelRefetch: false },
    ),
  ];
  if (documentId) {
    requests.push(
      client.resetQueries(
        { queryKey: chatDocumentMetadataKey(userId, documentId) },
        { cancelRefetch: false },
      ),
      client.resetQueries(
        { queryKey: documentFolderAccessKey(userId, documentId) },
        { cancelRefetch: false },
      ),
      client.resetQueries(
        { queryKey: ["document-sharing", documentId] },
        { cancelRefetch: false },
      ),
      client.resetQueries(
        { queryKey: ["document-preview", documentId] },
        { cancelRefetch: false },
      ),
      client.resetQueries(
        { queryKey: ["document-text-preview", documentId] },
        { cancelRefetch: false },
      ),
    );
  }

  return Promise.allSettled(requests);
}
