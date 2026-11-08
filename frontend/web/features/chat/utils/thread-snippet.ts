import { DocumentItemType } from "@/features/documents/types/documents.enums";
import type { ChatMetadataResponse } from "@/features/documents/types/documents.types";
import { MessageType } from "../types/chat.enums";
import type { ChatMessageResponse } from "../types/chat.types";
import { CHAT_MESSAGE_TYPES } from "../types/document.constants";
import { isTaskCardMessage } from "./task-card-message";

const TASK_SNIPPET_ID_LENGTH = 8;

export type ThreadDocumentMetadata = Pick<
  ChatMetadataResponse,
  "name" | "type" | "hasPermission"
>;

export interface ThreadSnippet {
  isTask: boolean;
  title: string;
  tag?: string;
  attachmentLabel?: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function attachmentKind(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";

  return "File";
}

function taskSnippet(content: string): ThreadSnippet {
  try {
    const payload: unknown = JSON.parse(content);
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const task = payload as Record<string, unknown>;
      const taskId = text(task.taskId);

      return {
        isTask: true,
        title:
          task.deleted === true
            ? "Deleted task"
            : text(task.title) || "Task Discussion",
        tag:
          text(task.tag) ||
          (taskId ? `[Task #${taskId.slice(0, TASK_SNIPPET_ID_LENGTH)}]` : ""),
      };
    }
  } catch {
    // Legacy task messages store their title and task tag as plain text.
  }
  const match = content.match(/\[Task #([a-f0-9-]+)\]/i);

  return {
    isTask: true,
    title:
      content
        .replace(/📋 Discussion Thread:\s*/i, "")
        .replace(/\[Task #[^\]]+\]/i, "")
        .trim() || "Task Discussion",
    tag: match ? `[Task #${match[1].slice(0, TASK_SNIPPET_ID_LENGTH)}]` : "",
  };
}

export function formatThreadSnippet(
  content: string | undefined | null,
  message?: ChatMessageResponse,
  documentMetadata?: ThreadDocumentMetadata | null,
): ThreadSnippet {
  if (message?.recalled) return { isTask: false, title: "Message recalled" };
  if (message?.type === CHAT_MESSAGE_TYPES.DOCUMENT) {
    if (
      documentMetadata === null ||
      documentMetadata?.hasPermission === false
    ) {
      return { isTask: false, title: "Shared document unavailable" };
    }
    const name = text(documentMetadata?.name);
    const kind =
      documentMetadata?.type === DocumentItemType.FOLDER ? "Folder" : "File";

    return {
      isTask: false,
      title: name ? `${kind}: ${name}` : "Shared document",
    };
  }
  const trimmed = content?.trim() || "";
  if (
    isTaskCardMessage({
      type: message?.type || MessageType.TEXT,
      content: trimmed,
    })
  ) {
    return taskSnippet(trimmed);
  }
  if (message?.type === MessageType.POLL || message?.poll) {
    const title = text(message.poll?.title);

    return { isTask: false, title: title ? `Poll: ${title}` : "Poll" };
  }
  if (message?.type === MessageType.NOTE || message?.note) {
    const title = text(message.note?.title);

    return { isTask: false, title: title ? `Note: ${title}` : "Note" };
  }
  if (message?.type === MessageType.MEETING || message?.meeting) {
    const title = text(message.meeting?.title);

    return { isTask: false, title: title ? `Meeting: ${title}` : "Meeting" };
  }
  const medias = message?.medias ?? [];
  const attachmentLabel = medias.length
    ? `${medias.length === 1 ? attachmentKind(medias[0].mimeType) : `Attachments (${medias.length})`}: ${medias.map((media) => text(media.name) || attachmentKind(media.mimeType)).join(", ")}`
    : undefined;

  return {
    isTask: false,
    title: trimmed || attachmentLabel || "Message",
    attachmentLabel,
  };
}

export function threadSnippetSearchText(snippet: ThreadSnippet): string {
  return [
    ...new Set(
      [snippet.title, snippet.tag, snippet.attachmentLabel].filter(Boolean),
    ),
  ].join(" ");
}

export function formatThreadReplyCount(count: number): string {
  return `${count} ${count === 1 ? "reply" : "replies"}`;
}
