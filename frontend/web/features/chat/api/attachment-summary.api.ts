import { api } from "@/lib/axios";
import type { ChatMessageResponse } from "../types/chat.types";
import { attachmentSummaryPrompt } from "../utils/attachment-summary";

export async function requestAttachmentSummary(
  message: Pick<ChatMessageResponse, "channelId" | "conversationId" | "threadParentId">,
  file: { id: string; name: string },
) {
  const chatId = message.channelId || message.conversationId;
  if (!chatId) throw new Error("Không xác định được cuộc hội thoại.");
  const scope = message.channelId ? "channels" : "direct-conversations";
  return api.post(`/api/${scope}/${chatId}/messages`, {
    type: "TEXT",
    content: attachmentSummaryPrompt(file.name),
    attachmentMediaId: file.id,
    ...(message.threadParentId ? { threadParentId: message.threadParentId } : {}),
  });
}
