import type { DocumentItem } from "./documents.types";

export enum DocumentBulkAction {
  MOVE = "MOVE",
  STAR = "STAR",
  UNSTAR = "UNSTAR",
  TRASH = "TRASH",
  RESTORE = "RESTORE",
  DELETE = "DELETE",
}

export interface DocumentBulkRequest {
  ids: string[];
  action: DocumentBulkAction;
  parentFolderId?: string | null;
  projectId?: string;
}

export interface DocumentMultiSelection {
  action?: DocumentBulkAction | null;
  items?: readonly DocumentItem[];
  selectedIds: ReadonlySet<string>;
  onToggle: (item: DocumentItem) => void;
  disabled: boolean;
  getDisabledReason?: (item: DocumentItem) => string | undefined;
}

export interface DocumentDragData {
  document: DocumentItem;
  items: DocumentItem[];
}
export type DocumentDropDestination = Omit<
  Pick<
    DocumentItem,
    | "id"
    | "name"
    | "type"
    | "projectId"
    | "parentFolderId"
    | "userRole"
    | "isArchived"
  >,
  "id"
> & { id: string | null; path?: { id: string | null; name: string }[] };
export interface DocumentDropData {
  document: DocumentDropDestination;
  ancestorIds: string[];
  canDrop: boolean;
  blockedReason?: string;
}

export const DOCUMENT_BULK_LABELS: Record<DocumentBulkAction, string> = {
  MOVE: "Move",
  STAR: "Star",
  UNSTAR: "Unstar",
  TRASH: "Move to trash",
  RESTORE: "Restore",
  DELETE: "Delete permanently",
};

export const DOCUMENT_BULK_MESSAGES = {
  NO_SELECTION: "Select files or folders first.",
  OWNER: "Owner permission is required.",
  EDITOR: "Editing permission is required.",
  PROJECT_ROOT: "Project root folders cannot be moved or deleted.",
  PROJECT_PERSONAL: "Project documents do not support stars or Trash.",
  ARCHIVED: "This action requires active files or folders.",
  RESTORE: "Only trashed items can be restored.",
  DELETE: "Move personal files or folders to Trash first.",
  MIXED_PROJECTS:
    "Move requires items from the same project, or only personal items.",
  NESTED_MOVE:
    "The parent folder is also selected. Deselect this item to preserve the folder structure.",
  PROJECT_DESTINATION:
    "Personal documents cannot be moved into project documents.",
  OTHER_PROJECT: "Choose a folder in the same project.",
  SELECTED_DESTINATION:
    "A selected folder and its contents cannot be used as the destination.",
  COMPLETE: "Selected items updated successfully.",
  FAILED:
    "Could not complete the action. Refresh the list before trying again.",
  INVALID_PAGINATION: "Could not read the complete document list.",
  SELECTION_CHANGED:
    "The document list changed during selection. Please select all again.",
  LOAD_FAILED: "Could not select all results. Please try again.",
  DROP_CHECKING: "Checking destination permissions…",
  DROP_UNAVAILABLE: "Could not verify this destination.",
  DROP_CURRENT_FOLDER: "These items are already in this folder.",
  DROP_FOLDER_REQUIRED: "Choose a folder as the destination.",
  DROP_VIEW_NOT_FOLDER:
    "This view is not a folder. Drop into a folder or My files.",
} as const;
