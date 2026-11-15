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
import { getDocumentChatShareAttempt } from "./document-chat-share-attempt";

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
  confirmInheritedEditorAccess = false,
  onAccessPrepared,
  assertCurrentActor = () => {},
}: {
  documentId: string;
  target: DocumentChatShareTarget;
  currentUserId: string;
  introMessage: string;
  confirmInheritedEditorAccess?: boolean;
  onAccessPrepared?: () => void;
  assertCurrentActor?: () => void;
}): Promise<{ requiresConfirmation: boolean; inheritedEditorCount: number }> {
  assertCurrentActor();
  const access = await documentsApi.getAccessibleItem(documentId);
  assertCurrentActor();
  let recipientIds: string[];
  if (access.projectId) {
    const status = await getProjectSpaceStatus(access.projectId);
    assertCurrentActor();
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
    assertCurrentActor();
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
    assertCurrentActor();
    const conversation =
      response.success &&
      response.data?.find((conversation) => conversation.id === target.chatId);
    if (
      !conversation ||
      !conversation.members?.some((member) => member.userId === currentUserId)
    )
      throw new Error(ERRORS.TARGET_UNAVAILABLE);
    const permission = await getDirectMessageSendPermission(target.chatId);
    assertCurrentActor();
    if (!permission.canSend) throw new Error(ERRORS.SEND_NOT_ALLOWED);
    recipientIds = conversation.members.map((member) => member.userId);
  }
  const recipients = [...new Set(recipientIds)].filter(
    (id) => id !== currentUserId,
  );
  if (!recipients.length && target.type === ShareTabType.DM)
    throw new Error(ERRORS.TARGET_UNAVAILABLE);
  // No message is sent if verification/granting fails.
  const permissionResult = recipients.length
    ? await documentsApi.prepareChatShare(
        documentId,
        recipients,
        confirmInheritedEditorAccess,
      )
    : { requiresConfirmation: false, inheritedEditorCount: 0 };
  assertCurrentActor();
  if (permissionResult.requiresConfirmation) return permissionResult;
  if (recipients.length) onAccessPrepared?.();
  const progress = await getDocumentChatShareAttempt(currentUserId, [
    documentId,
    target.type,
    target.chatId,
    introMessage.trim(),
  ]);
  progress.save();
  const send =
    target.type === ShareTabType.CHANNEL
      ? sendChannelMessage
      : sendDirectMessage;
  try {
    assertCurrentActor();
    if (introMessage.trim() && !progress.attempt.introSent) {
      const response = await send(target.chatId, {
        content: introMessage.trim(),
        type: "TEXT",
        clientRequestId: progress.attempt.introRequestId,
      });
      if (!response.success) throw new Error(ERRORS.SEND_FAILED);
      progress.attempt.introSent = true;
      progress.save();
    }
    assertCurrentActor();
    const response = await send(target.chatId, {
      content: documentId,
      type: "DOCUMENT",
      clientRequestId: progress.attempt.documentRequestId,
    });
    if (!response.success) throw new Error(ERRORS.SEND_FAILED);
    progress.complete();
  } catch (error) {
    throw new Error(ERRORS.SEND_FAILED, { cause: error });
  }

  return permissionResult;
}
