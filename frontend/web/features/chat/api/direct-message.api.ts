import { api } from "@/lib/axios";
import {
  ApiResponse,
  ChatMessageResponse,
  DirectConversationResponse,
  FollowedThreadResponse,
  MuteConversationResponse,
  PaginatedMediaResponse,
  PaginatedMessagesResponse,
  PinnedMessagesResponse,
  ThreadMessagesResponse,
} from "../types/chat.types";
import { normalizeApiResponse, normalizeDirectConversation } from "./chat.api";

const DM_API_ROUTES = {
  directConversations: "/api/direct-conversations",
  directConversation: (conversationId: string) =>
    `/api/direct-conversations/${conversationId}`,
  directMessages: (conversationId: string) =>
    `/api/direct-conversations/${conversationId}/messages`,
  directMessageRead: (conversationId: string) =>
    `/api/direct-conversations/${conversationId}/messages/read`,
  directMessageEdit: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}`,
  directMessageRecall: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}/recall`,
  directMessageDelete: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}`,
  directMessageSearch: (conversationId: string) =>
    `/api/direct-conversations/${conversationId}/messages/search`,
  directMessageReaction: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}/reactions`,
  directMessagePin: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}/pin`,
  directMessageUnpin: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}/unpin`,
  directMedia: (conversationId: string) =>
    `/api/direct-conversations/${conversationId}/media`,
  directPinned: (conversationId: string) =>
    `/api/direct-conversations/${conversationId}/pinned-messages`,
  directMute: (conversationId: string) =>
    `/api/direct-conversations/${conversationId}/mute`,
  directPin: (conversationId: string) =>
    `/api/direct-conversations/${conversationId}/pin`,
  directThreads: (conversationId: string) =>
    `/api/direct-conversations/${conversationId}/threads`,
  directThreadMessages: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}/thread`,
  directThreadRead: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}/thread/read`,
  directThreadFollow: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}/thread/follow`,
  directFollowedThreads: "/api/direct-conversations/threads/followed",
} as const;

// ─── Conversations ─────────────────────────────────────────────────────────

export const createDirectConversation = async (
  participantId: string,
): Promise<ApiResponse<DirectConversationResponse>> => {
  const response = await api.post(DM_API_ROUTES.directConversations, {
    participantId,
  });
  const payload = response.data;
  return {
    ...normalizeApiResponse<DirectConversationResponse>(payload),
    data: normalizeDirectConversation(payload?.data ?? payload),
  };
};

export const getDirectConversations = async (
  search?: string,
): Promise<ApiResponse<DirectConversationResponse[]>> => {
  const response = await api.get(DM_API_ROUTES.directConversations, {
    params: { search: search || undefined },
  });
  const payload = response.data;
  const conversations = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(conversations)
      ? conversations.map(normalizeDirectConversation)
      : [],
  };
};

// ─── Messages ──────────────────────────────────────────────────────────────

export const sendDirectMessage = async (
  conversationId: string,
  payload: {
    content?: string;
    type?: string;
    medias?: {
      name: string;
      s3Key: string;
      mimeType: string;
      sizeBytes: number;
    }[];
    threadParentId?: string;
  },
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.post(
    DM_API_ROUTES.directMessages(conversationId),
    payload,
  );
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

export const getDirectConversationMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  direction?: "older" | "newer" | "around",
): Promise<ApiResponse<PaginatedMessagesResponse>> => {
  const response = await api.get(DM_API_ROUTES.directMessages(conversationId), {
    params: { cursor, limit, direction },
  });
  return normalizeApiResponse<PaginatedMessagesResponse>(response.data);
};

export const markDirectConversationAsRead = async (
  conversationId: string,
  messageId: string,
): Promise<ApiResponse<{ messageId: string }>> => {
  const response = await api.post(DM_API_ROUTES.directMessageRead(conversationId), {
    messageId,
  });
  return normalizeApiResponse<{ messageId: string }>(response.data);
};

export const editDirectMessage = async (
  messageId: string,
  content: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.patch(DM_API_ROUTES.directMessageEdit(messageId), {
    content,
  });
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

export const recallDirectMessage = async (
  messageId: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.patch(DM_API_ROUTES.directMessageRecall(messageId));
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

export const deleteDirectMessage = async (
  messageId: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.delete(DM_API_ROUTES.directMessageDelete(messageId));
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

export const searchDirectConversationMessages = async (
  conversationId: string,
  q?: string,
  senderId?: string,
  type?: "TEXT",
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(
    DM_API_ROUTES.directMessageSearch(conversationId),
    { params: { q, senderId, type } },
  );
  return normalizeApiResponse<ChatMessageResponse[]>(response.data);
};

// ─── Reactions ─────────────────────────────────────────────────────────────

export const addDirectReaction = async (
  messageId: string,
  emoji: string,
): Promise<ApiResponse<{ action: "add" | "remove" | "update"; emoji: string }>> => {
  const response = await api.post(DM_API_ROUTES.directMessageReaction(messageId), {
    emoji,
  });
  return normalizeApiResponse(response.data);
};

export const removeDirectReaction = async (
  messageId: string,
  emoji: string,
): Promise<ApiResponse<{ action: "remove"; emoji: string }>> => {
  const response = await api.delete(
    DM_API_ROUTES.directMessageReaction(messageId),
    { data: { emoji } },
  );
  return normalizeApiResponse<{ action: "remove"; emoji: string }>(response.data);
};

// ─── Pin ───────────────────────────────────────────────────────────────────

export const pinDirectMessage = async (
  messageId: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.patch(DM_API_ROUTES.directMessagePin(messageId));
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

export const unpinDirectMessage = async (
  messageId: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.patch(DM_API_ROUTES.directMessageUnpin(messageId));
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

// ─── Media & Pinned ────────────────────────────────────────────────────────

export const getDirectConversationMedia = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  mediaType?: string,
  q?: string,
): Promise<ApiResponse<PaginatedMediaResponse>> => {
  const response = await api.get(DM_API_ROUTES.directMedia(conversationId), {
    params: { cursor, limit, mediaType, q },
  });
  return normalizeApiResponse<PaginatedMediaResponse>(response.data);
};

export const getDirectPinnedMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  senderId?: string,
  q?: string,
): Promise<ApiResponse<PinnedMessagesResponse>> => {
  const response = await api.get(DM_API_ROUTES.directPinned(conversationId), {
    params: { cursor, limit, senderId, q },
  });
  return normalizeApiResponse<PinnedMessagesResponse>(response.data);
};

// ─── Mute / Pin Conversation ───────────────────────────────────────────────

export const muteDirectConversation = async (
  conversationId: string,
  muted: boolean,
): Promise<ApiResponse<MuteConversationResponse>> => {
  const response = await api.patch(DM_API_ROUTES.directMute(conversationId), {
    muted,
  });
  return normalizeApiResponse<MuteConversationResponse>(response.data);
};

export const pinDirectConversation = async (
  conversationId: string,
  pinned: boolean,
): Promise<ApiResponse<{ pinned: boolean }>> => {
  const response = await api.patch(DM_API_ROUTES.directPin(conversationId), {
    pinned,
  });
  return normalizeApiResponse<{ pinned: boolean }>(response.data);
};

// ─── Threads ───────────────────────────────────────────────────────────────

export const getDirectConversationThreads = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  senderId?: string,
): Promise<ApiResponse<PaginatedMessagesResponse>> => {
  const response = await api.get(DM_API_ROUTES.directThreads(conversationId), {
    params: { cursor, limit, senderId },
  });
  return normalizeApiResponse<PaginatedMessagesResponse>(response.data);
};

export const getDirectThreadMessages = async (
  messageId: string,
): Promise<ApiResponse<ThreadMessagesResponse>> => {
  const response = await api.get(DM_API_ROUTES.directThreadMessages(messageId));
  return normalizeApiResponse<ThreadMessagesResponse>(response.data);
};

export const markDirectThreadAsRead = async (
  messageId: string,
): Promise<ApiResponse<{ messageId: string; lastReadAt: string }>> => {
  const response = await api.post(DM_API_ROUTES.directThreadRead(messageId));
  return normalizeApiResponse<{ messageId: string; lastReadAt: string }>(
    response.data,
  );
};

export const followDirectThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.post(DM_API_ROUTES.directThreadFollow(messageId));
  return normalizeApiResponse<{ following: boolean }>(response.data);
};

export const unfollowDirectThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.delete(DM_API_ROUTES.directThreadFollow(messageId));
  return normalizeApiResponse<{ following: boolean }>(response.data);
};

export const getFollowedDirectThreads = async (): Promise<
  ApiResponse<FollowedThreadResponse[]>
> => {
  const response = await api.get(DM_API_ROUTES.directFollowedThreads);
  return normalizeApiResponse<FollowedThreadResponse[]>(response.data);
};
