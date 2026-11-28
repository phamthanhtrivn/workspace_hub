export const NOTE_EDITOR_LABELS = {
  content: "Note Content",
  preview: "Preview note",
  edit: "Edit note",
  previewRegion: "Note preview",
} as const;

export const NOTE_DIALOG_MESSAGES = {
  saveFailed: "Unable to save this note. Please try again.",
  discardTitle: "Discard changes?",
  discardDescription: "Your unsaved changes will be lost.",
  discard: "Discard changes",
  keepEditing: "Keep editing",
} as const;
export type NoteSaveResult = boolean | void;
export interface NoteDraft {
  title: string;
  content: string;
}
