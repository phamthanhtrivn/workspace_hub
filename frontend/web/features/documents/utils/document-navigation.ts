import { DOCUMENT_QUERY_PARAMS } from "../types/documents.constants";
import { DocumentRole, DocumentViewType } from "../types/documents.enums";

export const DOCUMENTS_PATH = "/documents";

const DOCUMENT_VIEW_QUERY_VALUES: Record<DocumentViewType, string | null> = {
  [DocumentViewType.MY_FILES]: null,
  [DocumentViewType.SHARED]: "shared",
  [DocumentViewType.STARRED]: "starred",
  [DocumentViewType.TRASH]: "trash",
};

export function parseDocumentView(value: string | null): DocumentViewType {
  return (
    Object.values(DocumentViewType).find(
      (view) => view === value?.toUpperCase(),
    ) ?? DocumentViewType.MY_FILES
  );
}

export function getDocumentViewUrl(
  view: DocumentViewType,
  folderId?: string | null,
): string {
  const params = new URLSearchParams();
  const value = DOCUMENT_VIEW_QUERY_VALUES[view];
  if (value) params.set(DOCUMENT_QUERY_PARAMS.VIEW, value);
  if (folderId) params.set(DOCUMENT_QUERY_PARAMS.FOLDER_ID, folderId);

  return `${DOCUMENTS_PATH}${params.size ? `?${params}` : ""}`;
}

export function getDocumentView(role: DocumentRole): DocumentViewType {
  return role === DocumentRole.OWNER
    ? DocumentViewType.MY_FILES
    : DocumentViewType.SHARED;
}

export function getDocumentFolderUrl(
  folderId: string,
  role: DocumentRole,
): string {
  return getDocumentViewUrl(getDocumentView(role), folderId);
}

export function canonicalizeDocumentFolderQuery(
  query: string,
  role?: DocumentRole,
): string {
  const params = new URLSearchParams(query);
  let view = parseDocumentView(params.get(DOCUMENT_QUERY_PARAMS.VIEW));
  if (
    params.get(DOCUMENT_QUERY_PARAMS.FOLDER_ID) &&
    role &&
    (view === DocumentViewType.MY_FILES || view === DocumentViewType.SHARED)
  ) {
    view = getDocumentView(role);
  }
  const canonical = DOCUMENT_VIEW_QUERY_VALUES[view];
  if (canonical) params.set(DOCUMENT_QUERY_PARAMS.VIEW, canonical);
  else params.delete(DOCUMENT_QUERY_PARAMS.VIEW);

  return params.toString();
}

export const documentFolderAccessKey = (
  userId: string | null | undefined,
  folderId: string | null,
) => ["documents", "folder-access", userId, folderId] as const;
