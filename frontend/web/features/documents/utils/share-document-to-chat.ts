import { getSpaceChannels } from "@/features/chat/api/space.api";
import {
  getDirectConversations,
  getDirectMessageSendPermission,
  sendDirectMessage,
} from "@/features/chat/api/direct-message.api";
import { sendChannelMessage } from "@/features/chat/api/channel.api";
import { getProjectSpaceStatus } from "@/features/project/api/project.api";
import { SpaceRole } from "@/features/chat/types/chat.enums";
import { documentsApi } from "../api/documents.api";
import { ShareTabType } from "../types/documents.enums";
import { DOCUMENT_CHAT_SHARE_ERRORS as ERRORS } from "../types/document-chat-sharing.constants";

export interface DocumentChatShareTarget {
  type: ShareTabType;
  chatId: string;
  spaceId?: string;
}

export async function shareDocumentToChat({
  documentId,
  target,
  currentUserId,
  introMessage,
}: {
  documentId: string;
  target: DocumentChatShareTarget;
  currentUserId: string;
  introMessage: string;
}): Promise<void> {
  const access = await documentsApi.getAccessibleItem(documentId);
  let recipientIds: string[];
  if (access.projectId) {
    const status = await getProjectSpaceStatus(access.projectId);
    if (
      target.type !== ShareTabType.CHANNEL ||
      !status.spaceId ||
      target.spaceId !== status.spaceId
    ) {
      throw new Error(ERRORS.PROJECT_CHANNEL_REQUIRED);
    }
  }
  if (target.type === ShareTabType.CHANNEL) {
    if (!target.spaceId) throw new Error(ERRORS.TARGET_UNAVAILABLE);
    // This endpoint includes the complete membership, unlike the limited member search.
    const response = await getSpaceChannels(target.spaceId);
    const channel =
      response.success &&
      response.data?.find((channel) => channel.id === target.chatId);
    const sender =
      channel &&
      channel.members?.find((member) => member.userId === currentUserId);
    if (!channel || !sender) throw new Error(ERRORS.TARGET_UNAVAILABLE);
    if (
      sender.role === SpaceRole.MEMBER &&
      channel.setting?.allowSendMessage === false
    )
      throw new Error(ERRORS.SEND_NOT_ALLOWED);
    recipientIds = channel.members.map((member) => member.userId);
  } else {
    const response = await getDirectConversations();
    const conversation =
      response.success &&
      response.data?.find((conversation) => conversation.id === target.chatId);
    if (
      !conversation ||
      !conversation.members?.some((member) => member.userId === currentUserId)
    )
      throw new Error(ERRORS.TARGET_UNAVAILABLE);
    const permission = await getDirectMessageSendPermission(target.chatId);
    if (!permission.canSend) throw new Error(ERRORS.SEND_NOT_ALLOWED);
    recipientIds = conversation.members.map((member) => member.userId);
  }
  const recipients = [...new Set(recipientIds)].filter(
    (id) => id !== currentUserId,
  );
  if (!recipients.length && target.type === ShareTabType.DM)
    throw new Error(ERRORS.TARGET_UNAVAILABLE);
  // No message is sent if verification/granting fails.
  if (recipients.length)
    await documentsApi.prepareChatShare(documentId, recipients);
  const send =
    target.type === ShareTabType.CHANNEL
      ? sendChannelMessage
      : sendDirectMessage;
  try {
    if (introMessage.trim()) {
      const response = await send(target.chatId, {
        content: introMessage.trim(),
        type: "TEXT",
      });
      if (!response.success) throw new Error(ERRORS.SEND_FAILED);
    }
    const response = await send(target.chatId, {
      content: documentId,
      type: "DOCUMENT",
    });
    if (!response.success) throw new Error(ERRORS.SEND_FAILED);
  } catch (error) {
    throw new Error(ERRORS.SEND_FAILED, { cause: error });
  }
}
