import { ChatContextType, type ChatUiType } from "../types/chat.types";

interface ChatConversationUrlParams {
  channelId?: string | null;
  conversationId?: string | null;
  spaceId?: string | null;
}

export interface ChatRouteSelection {
  chatId: string;
  chatType: ChatUiType;
  spaceId?: string | null;
}

export const CHAT_ROUTE = "/chat";

const CHAT_TYPE_QUERY_PARAM = "type";
const CHAT_ID_QUERY_PARAM = "id";
const CHAT_SPACE_ID_QUERY_PARAM = "spaceId";
const CHAT_CHANNEL_TYPE = "channel";
const CHAT_DIRECT_TYPE = "direct";

export function buildChatConversationUrl({
  channelId,
  conversationId,
  spaceId,
}: ChatConversationUrlParams) {
  const normalizedConversationId = conversationId?.trim();
  const normalizedChannelId = channelId?.trim();
  const normalizedSpaceId = spaceId?.trim();
  const chatId = normalizedConversationId || normalizedChannelId;
  if (!chatId) return null;

  const params = new URLSearchParams({
    [CHAT_TYPE_QUERY_PARAM]: normalizedConversationId
      ? CHAT_DIRECT_TYPE
      : CHAT_CHANNEL_TYPE,
    [CHAT_ID_QUERY_PARAM]: chatId,
  });
  if (normalizedSpaceId && normalizedChannelId) {
    params.set(CHAT_SPACE_ID_QUERY_PARAM, normalizedSpaceId);
  }

  return `${CHAT_ROUTE}?${params.toString()}`;
}

export function parseChatRouteSelection(
  search: string,
): ChatRouteSelection | null {
  const params = new URLSearchParams(search);
  const conversationId = params.get("conversationId")?.trim();
  if (conversationId) {
    return {
      chatId: conversationId,
      chatType: ChatContextType.DIRECT_MESSAGE,
    };
  }

  const channelId = params.get("channelId")?.trim();
  if (channelId) {
    return {
      chatId: channelId,
      chatType: ChatContextType.CHANNEL,
      spaceId: params.get(CHAT_SPACE_ID_QUERY_PARAM)?.trim() || null,
    };
  }

  const chatId = params.get(CHAT_ID_QUERY_PARAM)?.trim();
  if (!chatId) return null;

  const chatType = params.get(CHAT_TYPE_QUERY_PARAM)?.trim();
  if (chatType === CHAT_CHANNEL_TYPE) {
    return {
      chatId,
      chatType: ChatContextType.CHANNEL,
      spaceId: params.get(CHAT_SPACE_ID_QUERY_PARAM)?.trim() || null,
    };
  }

  return {
    chatId,
    chatType: ChatContextType.DIRECT_MESSAGE,
    spaceId: null,
  };
}

export function normalizeChatConversationUrl(search: string) {
  const selection = parseChatRouteSelection(search);
  if (!selection) return CHAT_ROUTE;

  return buildChatConversationUrl({
    channelId:
      selection.chatType === ChatContextType.CHANNEL
        ? selection.chatId
        : null,
    conversationId:
      selection.chatType === ChatContextType.DIRECT_MESSAGE
        ? selection.chatId
        : null,
    spaceId: selection.spaceId,
  });
}
