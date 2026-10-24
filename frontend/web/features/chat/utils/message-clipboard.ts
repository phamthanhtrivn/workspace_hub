import { copyContentToClipboard, copyTextToClipboard } from "@/lib/clipboard";
import { MessageType } from "../types/chat.enums";
import {
  CHAT_ATTACHMENT_MAX_SIZE_BYTES,
  MESSAGE_CLIPBOARD_ATTRIBUTE,
  MESSAGE_CLIPBOARD_MESSAGES,
  type CopiedMessage,
  type CopiedMessageMedia,
  type CopyableChatMessage,
} from "../types/message-clipboard.types";
import { isTaskCardMessage } from "./task-card-message";

let copiedMessage: CopiedMessage | null = null;
let clipboardRevision = 0;

export function clearCopiedMessage(): void {
  clipboardRevision++;
  copiedMessage = null;
}

export function canCopyMessage(message: CopyableChatMessage): boolean {
  return !message.recalled && message.type === MessageType.TEXT &&
    !isTaskCardMessage(message) &&
    (Boolean(message.content?.trim()) || Boolean(message.medias?.length));
}

export async function copyMessageToClipboard(message: CopyableChatMessage, userId: string): Promise<void> {
  clearCopiedMessage();
  const revision = clipboardRevision;
  if (!userId || !canCopyMessage(message)) throw new Error(MESSAGE_CLIPBOARD_MESSAGES.copyFailed);

  const content = message.content ?? "";
  if (!message.medias?.length) {
    await copyTextToClipboard(content);
    return;
  }

  const payload: CopiedMessage = {
    token: crypto.randomUUID(),
    userId,
    content,
    medias: message.medias.map(({ name, fileUrl, mimeType, sizeBytes }) => ({ name, fileUrl, mimeType, sizeBytes })),
  };
  // Serialize text with the DOM so Markdown and HTML-looking code stay literal.
  const marker = document.createElement("span");
  marker.setAttribute(MESSAGE_CLIPBOARD_ATTRIBUTE, payload.token);
  marker.textContent = content;
  if (!content) marker.appendChild(document.createElement("br"));
  await copyContentToClipboard({ text: content, html: marker.outerHTML });
  if (revision !== clipboardRevision) throw new Error(MESSAGE_CLIPBOARD_MESSAGES.copyFailed);
  copiedMessage = payload;
}

export function readCopiedMessage(clipboard: Pick<DataTransfer, "getData">, userId: string | null): {
  hasMarker: boolean;
  message: CopiedMessage | null;
} {
  const html = clipboard.getData("text/html");
  if (!html.includes(MESSAGE_CLIPBOARD_ATTRIBUTE)) return { hasMarker: false, message: null };
  // Parse inertly; never mount clipboard HTML, fetch its URLs or execute it.
  const parsed = document.createElement("template");
  parsed.innerHTML = html;
  const token = parsed.content.querySelector(`[${MESSAGE_CLIPBOARD_ATTRIBUTE}]`)?.getAttribute(MESSAGE_CLIPBOARD_ATTRIBUTE);
  const matches = copiedMessage && token === copiedMessage.token && userId === copiedMessage.userId &&
    clipboard.getData("text/plain").replace(/\r\n/g, "\n") === copiedMessage.content.replace(/\r\n/g, "\n");
  return { hasMarker: Boolean(token), message: matches ? copiedMessage : null };
}

export function insertCopiedText(value: string, text: string, start: number, end: number) {
  return { value: value.slice(0, start) + text + value.slice(end), caret: start + text.length };
}

export async function downloadCopiedMessageFile(media: CopiedMessageMedia, signal: AbortSignal): Promise<File> {
  if (media.sizeBytes > CHAT_ATTACHMENT_MAX_SIZE_BYTES) throw new Error(MESSAGE_CLIPBOARD_MESSAGES.fileTooLarge);
  const response = await fetch(media.fileUrl, { signal });
  if (!response.ok) throw new Error(MESSAGE_CLIPBOARD_MESSAGES.fileFailed);
  const blob = await response.blob();
  if (blob.size > CHAT_ATTACHMENT_MAX_SIZE_BYTES) throw new Error(MESSAGE_CLIPBOARD_MESSAGES.fileTooLarge);
  return new File([blob], media.name, { type: media.mimeType || blob.type || "application/octet-stream" });
}
