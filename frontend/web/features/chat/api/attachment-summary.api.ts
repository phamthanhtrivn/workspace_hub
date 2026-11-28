import { api } from "@/lib/axios";
import type { ChatMessageResponse } from "../types/chat.types";
import { attachmentSummaryPrompt } from "../utils/attachment-summary";
import { z } from "zod";

const summaryReceipt = z.object({
  reused: z.boolean(),
  status: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]),
  reply: z
    .object({ id: z.string().uuid(), content: z.string().max(20000) })
    .optional(),
});
export type AttachmentSummaryReceipt = z.infer<typeof summaryReceipt>;

export async function requestAttachmentSummary(
  message: Pick<
    ChatMessageResponse,
    "channelId" | "conversationId" | "threadParentId"
  >,
  file: { id: string; name: string },
  options: { regenerate?: boolean; actionId?: string } = {},
) {
  const chatId = message.channelId || message.conversationId;
  if (!chatId) throw new Error("This conversation is unavailable.");
  const scope = message.channelId ? "channels" : "direct-conversations";
  const response = await api.post(`/api/${scope}/${chatId}/messages`, {
    type: "TEXT",
    content: attachmentSummaryPrompt(file.name),
    attachmentMediaId: file.id,
    summaryOptions: {
      regenerate: options.regenerate ?? false,
      actionId: options.actionId ?? crypto.randomUUID(),
    },
    ...(message.threadParentId
      ? { threadParentId: message.threadParentId }
      : {}),
  });

  return summaryReceipt.parse(response.data.data.summary);
}
