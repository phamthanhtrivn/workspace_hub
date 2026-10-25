import type { ChatMediaResponse, ChatMessageResponse } from "./chat.types";

export type CopyableChatMessage = Pick<ChatMessageResponse, "type" | "content" | "medias"> & {
  recalled?: boolean;
};

export type CopiedMessageMedia = Pick<ChatMediaResponse, "name" | "fileUrl" | "mimeType" | "sizeBytes">;

export interface CopiedMessage {
  token: string;
  userId: string;
  content: string;
  medias: CopiedMessageMedia[];
}

export interface PastingMessageFile {
  id: string;
  name: string;
  status: "downloading" | "error";
}

export const MESSAGE_CLIPBOARD_ATTRIBUTE = "data-workspacehub-message-copy";
export const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024;
export const MESSAGE_CLIPBOARD_MESSAGES = {
  copied: "Message copied. Paste it into a channel or direct message.",
  copyFailed: "Could not copy this message. Please try again.",
  expired: "Copied attachments are no longer available. Copy the original message again.",
  fileFailed: "Could not prepare an attachment. Remove it and copy the original message again to retry.",
  fileTooLarge: "File size limit exceeded (max 100MB).",
  pending: "Please wait for files to finish uploading.",
  failedFiles: "Remove failed attachments before sending, or copy and paste them again to retry.",
  uploadFailed: "Upload failed — remove and retry",
  prepareFailed: "Could not prepare file",
  preparing: "Preparing attachment…",
} as const;
