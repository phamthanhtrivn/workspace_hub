import { MessageType } from "../types/chat.enums";
import type { ChatMessageResponse } from "../types/chat.types";

export function isTaskCardMessage(
  message: Pick<ChatMessageResponse, "type" | "content">,
): boolean {
  if (message.type === MessageType.TASK) return true;
  const content = message.content?.trim();
  if (!content) return false;
  if (content.includes("[Task #")) return true;

  if (content.startsWith("{") && content.endsWith("}")) {
    try {
      const payload: unknown = JSON.parse(content);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
      const task = payload as Record<string, unknown>;
      return task.type === MessageType.TASK ||
        (typeof task.taskId === "string" && task.taskId.length > 0);
    } catch {
      return false;
    }
  }
  return false;
}
