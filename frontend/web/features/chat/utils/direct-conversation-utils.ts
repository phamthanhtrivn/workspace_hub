import { ConversationResponse, ChannelResponse } from "../types/chat.types";

function getCurrentMember(
  conversation: ConversationResponse,
  userId?: string | null,
) {
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

export function isChannelPinned(
  channel: ChannelResponse,
  userId?: string | null,
) {
  return !!channel.members?.find((member) => member.userId === userId)?.pinned;
}

export function sortChannelsByPin(
  channels: ChannelResponse[],
  userId?: string | null,
) {
  return [...channels].sort((a, b) => {
    const aPinned = isChannelPinned(a, userId);
    const bPinned = isChannelPinned(b, userId);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
