export const VERSION_MESSAGES = {
  singleFile: "Please upload one version at a time.",
  uploadBusy:
    "A version upload is already running. Wait for it to finish before adding another file.",
  currentSaved: "Current version updated.",
  currentFailed: "Could not update the current version. Please try again.",
  currentHelp:
    "Select the version used for preview and download, then save. Uploading a new version still makes it current.",
  dropHelp:
    "Drop one file here or click to choose. Old versions stay in history.",
  saveCurrent: "Save current version",
  saving: "Saving…",
  uploadFinished: "Version upload finished",
  uploading: "Uploading version",
  deleteAction: "Delete version",
  deleteSaved: "Version permanently deleted.",
  deleteFailed: "Could not delete this version. Please try again.",
  deleteCurrent: "Choose another Current version before deleting this version.",
  deleteLast:
    "Keep at least one version. The last remaining version cannot be deleted.",
  operationBusy:
    "Wait for the current version operation to finish, then try again.",
  deleteTitle: (versionNumber: number) => `Delete version v${versionNumber}?`,
  deleteDescription: (name: string) =>
    `This permanently deletes the selected version of “${name}”. It cannot be restored and will not go to Trash.`,
} as const;

export const DOCUMENT_VERSION_ROUTES = {
  current: (id: string) => `/api/documents/${id}/versions/current`,
  publicCurrent: (id: string) => `/api/documents/public/${id}/versions/current`,
  version: (id: string, versionId: string) =>
    `/api/documents/${id}/versions/${versionId}`,
  publicVersion: (id: string, versionId: string) =>
    `/api/documents/public/${id}/versions/${versionId}`,
};

export const VERSION_MENU_CLASSES = {
  content: "w-48 font-sans text-xs font-semibold text-foreground",
  item: "flex w-full items-center justify-start gap-2.5 rounded-control px-3 py-2 text-left text-xs font-semibold text-info-content hover:bg-accent hover:text-info-content data-[highlighted]:bg-accent data-[highlighted]:text-info-content",
  destructive:
    "text-destructive-content hover:bg-destructive-soft hover:text-destructive-content data-[highlighted]:bg-destructive-soft data-[highlighted]:text-destructive-content",
  blocked:
    "text-destructive-content hover:bg-accent hover:text-destructive-content data-[highlighted]:bg-accent data-[highlighted]:text-destructive-content",
} as const;
