import type { DocumentItem } from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import {
  DocumentBulkAction as Action,
  DOCUMENT_BULK as M,
} from './types/document-bulk.constants';

export function documentBulkBlockReason(
  item: DocumentItem,
  role: DocumentRole,
  action: Action,
  isStarred?: boolean,
): string | undefined {
  const personalAction =
    action === Action.STAR ||
    action === Action.UNSTAR ||
    action === Action.TRASH ||
    action === Action.RESTORE;
  if (item.projectId && personalAction) return M.PROJECT_PERSONAL_ACTION;
  if (
    item.projectId &&
    item.parentFolderId === null &&
    (action === Action.MOVE || action === Action.DELETE)
  )
    return M.PROJECT_ROOT;
  if (action === Action.RESTORE) {
    if (!item.isArchived) return M.RESTORE_REQUIRED;
  } else if (action !== Action.DELETE && item.isArchived)
    return M.ACTIVE_REQUIRED;
  if (action === Action.DELETE && !item.projectId && !item.isArchived)
    return M.TRASH_REQUIRED;
  if (action === Action.STAR || action === Action.UNSTAR)
    if (role !== DocumentRole.OWNER) return M.OWNER_REQUIRED;
  if (action === Action.UNSTAR && isStarred === false) return M.UNSTAR_REQUIRED;
  if (action === Action.STAR || action === Action.UNSTAR) return;
  if (item.projectId)
    return role === DocumentRole.VIEWER ? M.EDITOR_REQUIRED : undefined;

  return role === DocumentRole.OWNER ? undefined : M.OWNER_REQUIRED;
}
