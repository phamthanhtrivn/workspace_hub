import { DocumentViewType, DocumentRole, DocumentItemType } from "../types/documents.enums";

export interface NavigationLabels {
  title: string;
  description: string;
}

export function getDocumentViewLabels(
  viewType: DocumentViewType,
  currentFolderName?: string
): NavigationLabels {
  switch (viewType) {
    case DocumentViewType.MY_FILES:
      return {
        title: currentFolderName || "My Files",
        description: "Manage and organize your personal files and folders",
      };
    case DocumentViewType.SHARED:
      return {
        title: "Shared with me",
        description: "Files and folders shared with you by team members",
      };
    case DocumentViewType.STARRED:
      return {
        title: "Starred",
        description: "Quick access to your bookmarked files and folders",
      };
    case DocumentViewType.TRASH:
      return {
        title: "Trash",
        description: "Items in trash will be permanently deleted after 30 days",
      };
    default:
      return {
        title: "Documents",
        description: "Overview of all accessible document resources",
      };
  }
}

export function getRoleLabel(role: DocumentRole | string): string {
  switch (role.toUpperCase()) {
    case DocumentRole.OWNER:
    case "OWNER":
      return "Owner";
    case DocumentRole.EDITOR:
    case "EDITOR":
      return "Can edit";
    case DocumentRole.VIEWER:
    case "VIEWER":
      return "Can view";
    default:
      return "Viewer";
  }
}

export function getItemTypeLabel(type: DocumentItemType | string): string {
  return type === DocumentItemType.FOLDER || type === "FOLDER" ? "Folder" : "File";
}
