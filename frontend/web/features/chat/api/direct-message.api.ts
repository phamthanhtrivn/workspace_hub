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

// ─── Conversations ─────────────────────────────────────────────────────────

export const createDirectConversation = async (
  participantId: string,
): Promise<ApiResponse<DirectConversationResponse>> => {
  const response = await api.post("/api/direct-conversations", {
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
  const response = await api.get("/api/direct-conversations", {
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
    mentions?: string[];
  },
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.post(
    `/api/direct-conversations/${conversationId}/messages`,
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
  const response = await api.get(
    `/api/direct-conversations/${conversationId}/messages`,
    { params: { cursor, limit, direction } },
  );
  return normalizeApiResponse<PaginatedMessagesResponse>(response.data);
};

export const markDirectConversationAsRead = async (
  conversationId: string,
  messageId: string,
): Promise<ApiResponse<{ messageId: string }>> => {
  const response = await api.post(
    `/api/direct-conversations/${conversationId}/messages/read`,
    { messageId },
  );
  return normalizeApiResponse<{ messageId: string }>(response.data);
};

export const editDirectMessage = async (
  messageId: string,
  content: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.patch(
    `/api/direct-conversations/messages/${messageId}`,
    { content },
  );
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

export const recallDirectMessage = async (
  messageId: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.patch(
    `/api/direct-conversations/messages/${messageId}/recall`,
  );
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

export const deleteDirectMessage = async (
  messageId: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.delete(
    `/api/direct-conversations/messages/${messageId}`,
  );
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

export const searchDirectConversationMessages = async (
  conversationId: string,
  q?: string,
  senderId?: string,
  type?: "TEXT",
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(
    `/api/direct-conversations/${conversationId}/messages/search`,
    { params: { q, senderId, type } },
  );
  return normalizeApiResponse<ChatMessageResponse[]>(response.data);
};

// ─── Reactions ─────────────────────────────────────────────────────────────

export const addDirectReaction = async (
  messageId: string,
  emoji: string,
): Promise<
  ApiResponse<{ action: "add" | "remove" | "update"; emoji: string }>
> => {
  const response = await api.post(
    `/api/direct-conversations/messages/${messageId}/reactions`,
    { emoji },
  );
  return normalizeApiResponse(response.data);
};

export const removeDirectReaction = async (
  messageId: string,
  emoji: string,
): Promise<ApiResponse<{ action: "remove"; emoji: string }>> => {
  const response = await api.delete(
    `/api/direct-conversations/messages/${messageId}/reactions`,
    { data: { emoji } },
  );
  return normalizeApiResponse<{ action: "remove"; emoji: string }>(
    response.data,
  );
};

// ─── Pin ───────────────────────────────────────────────────────────────────

export const pinDirectMessage = async (
  messageId: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.patch(
    `/api/direct-conversations/messages/${messageId}/pin`,
  );
  return normalizeApiResponse<ChatMessageResponse>(response.data);
};

export const unpinDirectMessage = async (
  messageId: string,
): Promise<ApiResponse<ChatMessageResponse>> => {
  const response = await api.patch(
    `/api/direct-conversations/messages/${messageId}/unpin`,
  );
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
  const response = await api.get(
    `/api/direct-conversations/${conversationId}/media`,
    { params: { cursor, limit, mediaType, q } },
  );
  return normalizeApiResponse<PaginatedMediaResponse>(response.data);
};

export const getDirectPinnedMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  senderId?: string,
  q?: string,
): Promise<ApiResponse<PinnedMessagesResponse>> => {
  const response = await api.get(
    `/api/direct-conversations/${conversationId}/pinned-messages`,
    { params: { cursor, limit, senderId, q } },
  );
  return normalizeApiResponse<PinnedMessagesResponse>(response.data);
};

// ─── Mute / Pin Conversation ───────────────────────────────────────────────

export const muteDirectConversation = async (
  conversationId: string,
  muted: boolean,
): Promise<ApiResponse<MuteConversationResponse>> => {
  const response = await api.patch(
    `/api/direct-conversations/${conversationId}/mute`,
    { muted },
  );
  return normalizeApiResponse<MuteConversationResponse>(response.data);
};

export const pinDirectConversation = async (
  conversationId: string,
  pinned: boolean,
): Promise<ApiResponse<{ pinned: boolean }>> => {
  const response = await api.patch(
    `/api/direct-conversations/${conversationId}/pin`,
    { pinned },
  );
  return normalizeApiResponse<{ pinned: boolean }>(response.data);
};

// ─── Threads ───────────────────────────────────────────────────────────────

export const getDirectConversationThreads = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  senderId?: string,
): Promise<ApiResponse<PaginatedMessagesResponse>> => {
  const response = await api.get(
    `/api/direct-conversations/${conversationId}/threads`,
    { params: { cursor, limit, senderId } },
  );
  return normalizeApiResponse<PaginatedMessagesResponse>(response.data);
};

export const getDirectThreadMessages = async (
  messageId: string,
): Promise<ApiResponse<ThreadMessagesResponse>> => {
  const response = await api.get(
    `/api/direct-conversations/messages/${messageId}/thread`,
  );
  return normalizeApiResponse<ThreadMessagesResponse>(response.data);
};

export const markDirectThreadAsRead = async (
  messageId: string,
): Promise<ApiResponse<{ messageId: string; lastReadAt: string }>> => {
  const response = await api.post(
    `/api/direct-conversations/messages/${messageId}/thread/read`,
  );
  return normalizeApiResponse<{ messageId: string; lastReadAt: string }>(
    response.data,
  );
};

export const followDirectThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.post(
    `/api/direct-conversations/messages/${messageId}/thread/follow`,
  );
  return normalizeApiResponse<{ following: boolean }>(response.data);
};

export const unfollowDirectThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.delete(
    `/api/direct-conversations/messages/${messageId}/thread/follow`,
  );
  return normalizeApiResponse<{ following: boolean }>(response.data);
};

export const getFollowedDirectThreads = async (): Promise<
  ApiResponse<FollowedThreadResponse[]>
> => {
  const response = await api.get("/api/direct-conversations/threads/followed");
  return normalizeApiResponse<FollowedThreadResponse[]>(response.data);
};
