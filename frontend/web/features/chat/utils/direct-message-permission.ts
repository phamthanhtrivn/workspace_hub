import type { DirectMessageSendPermission } from "../types/chat.types";

interface DirectMessageInputNoticeOptions {
  conversationId?: string | null;
  hasDirectMessages: boolean;
  isPermissionPending: boolean;
  isPermissionError: boolean;
  sendPermission?: DirectMessageSendPermission;
}

export function getDirectMessageInputNotice({
  conversationId,
  hasDirectMessages,
  isPermissionPending,
  isPermissionError,
  sendPermission,
}: DirectMessageInputNoticeOptions): string | null {
  if (hasDirectMessages) return null;
  if (!conversationId || isPermissionPending) {
    return "Checking whether you can send a message...";
  }
  if (isPermissionError) {
    return "Unable to check direct message permission right now.";
  }
  if (sendPermission?.canSend === false) {
    return "This person is not accepting new direct messages.";
  }
  if (sendPermission?.canSend === true) return null;
  return "Unable to check direct message permission right now.";
}
