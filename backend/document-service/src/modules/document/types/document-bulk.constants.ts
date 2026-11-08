export enum DocumentBulkAction {
  MOVE = 'MOVE',
  STAR = 'STAR',
  UNSTAR = 'UNSTAR',
  TRASH = 'TRASH',
  RESTORE = 'RESTORE',
  DELETE = 'DELETE',
}

export const DOCUMENT_BULK = {
  TRANSACTION_TIMEOUT_MS: 30000,
  INVALID_SELECTION:
    'Some selected items cannot perform this action. No items were changed.',
  NESTED_MOVE:
    'The parent folder is also selected. Deselect the nested item to preserve the folder structure.',
  PROJECT_ROOT: 'Project root folders cannot be moved or deleted.',
  PROJECT_PERSONAL_ACTION: 'Project documents do not support stars or Trash.',
  OWNER_REQUIRED: 'Only the owner can perform this action.',
  EDITOR_REQUIRED: 'Editing permission is required.',
  TRASH_REQUIRED:
    'Personal documents must be in Trash before permanent deletion.',
  ACTIVE_REQUIRED: 'This action requires an active file or folder.',
  RESTORE_REQUIRED: 'Only trashed items can be restored.',
  SUCCESS: 'Selected documents updated successfully',
} as const;
