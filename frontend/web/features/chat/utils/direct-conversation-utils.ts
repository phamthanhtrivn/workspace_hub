import { ConversationResponse } from "../types/chat.types";

function getCurrentMember(conversation: ConversationResponse, userId?: string | null) {
  return conversation.members?.find((member) => member.userId === userId);
}

export function isDirectConversationPinned(
  conversation: ConversationResponse,
  userId?: string | null,
) {
  return !!getCurrentMember(conversation, userId)?.pinned;
}

export function sortDirectConversations<T extends ConversationResponse>(
  conversations: T[],
  userId?: string | null,
) {
  return [...conversations].sort((a, b) => {
    const aPinned = isDirectConversationPinned(a, userId);
    const bPinned = isDirectConversationPinned(b, userId);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
