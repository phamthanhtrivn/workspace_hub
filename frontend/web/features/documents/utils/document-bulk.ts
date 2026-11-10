import { DocumentRole, DocumentItemType } from "../types/documents.enums";
import type { DocumentItem } from "../types/documents.types";
import {
  DocumentBulkAction as Action,
  DOCUMENT_BULK_MESSAGES as M,
} from "../types/document-bulk.types";
import { isProjectRootFolder } from "./project-documents";
import type { DocumentDropDestination } from "../types/document-bulk.types";

export function getBulkItemBlockReason(
  item: DocumentItem,
  action: Action,
): string | undefined {
  const role = item.userRole ?? DocumentRole.NONE;
  if (role === DocumentRole.NONE) return M.OWNER;
  const personal =
    action === Action.STAR ||
    action === Action.UNSTAR ||
    action === Action.TRASH ||
    action === Action.RESTORE;
  if (item.projectId && personal) return M.PROJECT_PERSONAL;
  if (
    isProjectRootFolder(item) &&
    (action === Action.MOVE || action === Action.DELETE)
  )
    return M.PROJECT_ROOT;
  if (action === Action.RESTORE) {
    if (!item.isArchived) return M.RESTORE;
  } else if (action !== Action.DELETE && item.isArchived) return M.ARCHIVED;
  if (action === Action.DELETE && !item.projectId && !item.isArchived)
    return M.DELETE;
  if (action === Action.STAR || action === Action.UNSTAR)
    return role === DocumentRole.OWNER ? undefined : M.OWNER;
  if (item.projectId)
    return role === DocumentRole.VIEWER ? M.EDITOR : undefined;

  return role === DocumentRole.OWNER ? undefined : M.OWNER;
}

export function getBulkBlockers(items: DocumentItem[], action: Action) {
  const reasons = items.flatMap((item) => {
    const reason =
      action === Action.MOVE &&
      items.some((parent) => parent.id === item.parentFolderId)
        ? M.NESTED_MOVE
        : getBulkItemBlockReason(item, action);

    return reason ? [{ id: item.id, name: item.name, reason }] : [];
  });
  if (
    action === Action.MOVE &&
    new Set(items.map((item) => item.projectId)).size > 1
  ) {
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      reason: M.MIXED_PROJECTS,
    }));
  }

  return reasons;
}

export function getMoveDestinationBlockReason(
  folder: DocumentDropDestination,
  projectId?: string,
  excludedIds: readonly string[] = [],
): string | undefined {
  if (folder.id && excludedIds.includes(folder.id))
    return M.SELECTED_DESTINATION;
  if (projectId ? folder.projectId !== projectId : !!folder.projectId)
    return projectId ? M.OTHER_PROJECT : M.PROJECT_DESTINATION;
  if (folder.isArchived) return M.ARCHIVED;

  return folder.userRole === DocumentRole.OWNER ||
    folder.userRole === DocumentRole.EDITOR
    ? undefined
    : M.EDITOR;
}

export function getDocumentDropBlockReason(
  items: readonly DocumentItem[],
  folder: DocumentDropDestination,
  ancestorIds: readonly string[] = [],
): string | undefined {
  if (!items.length) return M.NO_SELECTION;
  if (folder.type !== DocumentItemType.FOLDER) return M.DROP_FOLDER_REQUIRED;
  const blockers = getBulkBlockers([...items], Action.MOVE);
  if (blockers.length) return blockers[0].reason;
  for (const item of items) {
    const reason = getMoveDestinationBlockReason(
      folder,
      item.projectId ?? undefined,
      items.map((selected) => selected.id),
    );
    if (reason) return reason;
    if (ancestorIds.includes(item.id) || folder.parentFolderId === item.id)
      return M.SELECTED_DESTINATION;
  }
  if (items.every((item) => item.parentFolderId === folder.id))
    return M.DROP_CURRENT_FOLDER;

  return;
}

export function buildDocumentDropPath(
  destination: DocumentDropDestination,
  ancestors: readonly { id: string; name: string }[] = [],
): { id: string | null; name: string }[] {
  const folders = ancestors.length
    ? [...ancestors]
    : destination.id
      ? [{ id: destination.id, name: destination.name }]
      : [];
  if (destination.projectId) return folders;

  return [
    {
      id: null,
      name: destination.userRole === DocumentRole.OWNER ? "My files" : "Shared",
    },
    ...folders,
  ];
}
