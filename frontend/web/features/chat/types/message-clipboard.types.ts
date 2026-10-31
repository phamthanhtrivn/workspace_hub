import type { ChatMediaResponse, ChatMessageResponse } from "./chat.types";
import { MAX_ATTACHMENT_SIZE_BYTES, ATTACHMENT_SIZE_LIMIT_MESSAGE } from "@/lib/upload-policy";

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
export const CHAT_ATTACHMENT_MAX_SIZE_BYTES = MAX_ATTACHMENT_SIZE_BYTES;
export const MESSAGE_CLIPBOARD_MESSAGES = {
  copied: "Message copied. Paste it into a channel or direct message.",
  copyFailed: "Could not copy this message. Please try again.",
  expired: "Copied attachments are no longer available. Copy the original message again.",
  fileFailed: "Could not prepare an attachment. Remove it and copy the original message again to retry.",
  fileTooLarge: ATTACHMENT_SIZE_LIMIT_MESSAGE,
  pending: "Please wait for files to finish uploading.",
  failedFiles: "Remove failed attachments before sending, or copy and paste them again to retry.",
  uploadFailed: "Upload failed — remove and retry",
  prepareFailed: "Could not prepare file",
  preparing: "Preparing attachment…",
} as const;
