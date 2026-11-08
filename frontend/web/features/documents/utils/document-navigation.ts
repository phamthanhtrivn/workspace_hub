import { DOCUMENT_QUERY_PARAMS } from "../types/documents.constants";
import { DocumentRole, DocumentViewType } from "../types/documents.enums";

export const DOCUMENTS_PATH = "/documents";

export function getDocumentView(role: DocumentRole): DocumentViewType {
  return role === DocumentRole.OWNER
    ? DocumentViewType.MY_FILES
    : DocumentViewType.SHARED;
}

export function getDocumentFolderUrl(
  folderId: string,
  role: DocumentRole,
): string {
  const params = new URLSearchParams({
    [DOCUMENT_QUERY_PARAMS.VIEW]: getDocumentView(role),
    [DOCUMENT_QUERY_PARAMS.FOLDER_ID]: folderId,
  });

  return `${DOCUMENTS_PATH}?${params}`;
}

export function canonicalizeDocumentFolderQuery(
  query: string,
  role: DocumentRole,
): string {
  const params = new URLSearchParams(query);
  const view = params.get(DOCUMENT_QUERY_PARAMS.VIEW);
  if (
    params.get(DOCUMENT_QUERY_PARAMS.FOLDER_ID) &&
    (!view ||
      view === DocumentViewType.MY_FILES ||
      view === DocumentViewType.SHARED)
  ) {
    params.set(DOCUMENT_QUERY_PARAMS.VIEW, getDocumentView(role));
  }

  return params.toString();
}

export const documentFolderAccessKey = (
  userId: string | null | undefined,
  folderId: string | null,
) => ["documents", "folder-access", userId, folderId] as const;
