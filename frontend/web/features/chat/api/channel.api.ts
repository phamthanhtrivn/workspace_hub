import { api } from "@/lib/axios";
import {
  ApiResponse,
  ChannelResponse,
  ChannelMembersListResponse,
  ChatMessageResponse,
  ConversationMember,
  ConversationSetting,
  FollowedThreadResponse,
  MuteConversationResponse,
  PaginatedMediaResponse,
  PaginatedMessagesResponse,
  PinnedMessagesResponse,
  ThreadMessagesResponse,
} from "../types/chat.types";
import { normalizeApiResponse } from "./chat.api";

// ─── Channel Members ───────────────────────────────────────────────────────

export const getChannelMembers = async (
  channelId: string,
  search?: string,
  limit?: number,
): Promise<ApiResponse<ChannelMembersListResponse>> => {
  const response = await api.get(`/api/channels/${channelId}/members`, {
    params: { search, limit },
  });
  return normalizeApiResponse<ChannelMembersListResponse>(response.data);
};

export const inviteMembers = async (
  channelId: string,
  memberIds: string[],
): Promise<ApiResponse<unknown>> => {
  const response = await api.post(`/api/channels/${channelId}/members/invite`, {
    memberIds,
  });
  return normalizeApiResponse<unknown>(response.data);
};

export const updateMemberRole = async (
  channelId: string,
  memberId: string,
  role: "ADMIN" | "MEMBER",
): Promise<ApiResponse<ConversationMember>> => {
  const response = await api.put(
    `/api/channels/${channelId}/members/${memberId}/role`,
    { role },
  );
  return normalizeApiResponse<ConversationMember>(response.data);
};

export const kickMember = async (
  channelId: string,
  memberId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(
    `/api/channels/${channelId}/members/${memberId}`,
  );
  return normalizeApiResponse<unknown>(response.data);
};

export const leaveChannel = async (
  channelId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(`/api/channels/${channelId}/leave`);
  return normalizeApiResponse<unknown>(response.data);
};

export const disbandChannel = async (
  channelId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(`/api/channels/${channelId}/disband`);
  return normalizeApiResponse<unknown>(response.data);
};

export const joinChannel = async (
  channelId: string,
): Promise<ApiResponse<ChannelResponse>> => {
  const response = await api.post(`/api/channels/${channelId}/join`);
  return normalizeApiResponse<ChannelResponse>(response.data);
};

// ─── Channel Info & Settings ───────────────────────────────────────────────

export const updateChannelInfo = async (
  channelId: string,
  name: string,
): Promise<ApiResponse<ChannelResponse>> => {
  const response = await api.patch(`/api/channels/${channelId}/info`, { name });
  return normalizeApiResponse<ChannelResponse>(response.data);
};

export const updateChannelSettings = async (
  channelId: string,
  settings: Partial<ConversationSetting>,
): Promise<ApiResponse<ConversationSetting>> => {
  const response = await api.patch(
    `/api/channels/${channelId}/settings`,
    settings,
  );
  return normalizeApiResponse<ConversationSetting>(response.data);
};

export const getChannelAvatarPresignedUrl = async (
  channelId: string,
  fileName: string,
  contentType: string,
): Promise<ApiResponse<{ presignedUrl: string; fileUrl?: string }>> => {
  const response = await api.get(
    `/api/channels/${channelId}/avatar/presigned-url`,
    { params: { fileName, contentType } },
  );
  return normalizeApiResponse<{ presignedUrl: string; fileUrl?: string }>(
    response.data,
  );
};

export const muteChannel = async (
  channelId: string,
  muted: boolean,
): Promise<ApiResponse<MuteConversationResponse>> => {
  const response = await api.patch(`/api/channels/${channelId}/mute`, {
    muted,
  });
  return normalizeApiResponse<MuteConversationResponse>(response.data);
};

export const pinChannel = async (
  channelId: string,
  pinned: boolean,
): Promise<ApiResponse<{ pinned: boolean }>> => {
  const response = await api.patch(`/api/channels/${channelId}/pin`, {
    pinned,
  });
  return normalizeApiResponse<{ pinned: boolean }>(response.data);
};

// ─── Channel Messages ──────────────────────────────────────────────────────

export const getChannelMessages = async (
  channelId: string,
  cursor?: string,
  limit?: number,
  direction?: "older" | "newer" | "around",
): Promise<ApiResponse<PaginatedMessagesResponse>> => {
  const response = await api.get(`/api/channels/${channelId}/messages`, {
    params: { cursor, limit, direction },
  });
  return normalizeApiResponse<PaginatedMessagesResponse>(response.data);
};

export const searchChannelMessages = async (
  channelId: string,
  q?: string,
  senderId?: string,
  type?: "TEXT",
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(`/api/channels/${channelId}/messages/search`, {
    params: { q, senderId, type },
  });
  return normalizeApiResponse<ChatMessageResponse[]>(response.data);
};

// ─── Channel Media & Pinned ────────────────────────────────────────────────

export const getChannelMedia = async (
  channelId: string,
  cursor?: string,
  limit?: number,
  mediaType?: string,
  q?: string,
): Promise<ApiResponse<PaginatedMediaResponse>> => {
  const response = await api.get(`/api/channels/${channelId}/media`, {
    params: { cursor, limit, mediaType, q },
  });
  return normalizeApiResponse<PaginatedMediaResponse>(response.data);
};

export const getPinnedMessages = async (
  channelId: string,
  cursor?: string,
  limit?: number,
  q?: string,
): Promise<ApiResponse<PinnedMessagesResponse>> => {
  const response = await api.get(`/api/channels/${channelId}/pinned-messages`, {
    params: { cursor, limit, q },
  });
  return normalizeApiResponse<PinnedMessagesResponse>(response.data);
};

// ─── Channel Threads ───────────────────────────────────────────────────────

export const getChannelThreads = async (
  channelId: string,
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(`/api/channels/messages/${channelId}/threads`);
  return normalizeApiResponse<ChatMessageResponse[]>(response.data);
};

export const getFollowedChannelThreads = async (): Promise<
  ApiResponse<FollowedThreadResponse[]>
> => {
  const response = await api.get("/api/channels/threads/followed");
  return normalizeApiResponse<FollowedThreadResponse[]>(response.data);
};

export const markChannelThreadAsRead = async (
  messageId: string,
): Promise<ApiResponse<{ messageId: string; lastReadAt: string }>> => {
  const response = await api.post(
    `/api/channels/messages/${messageId}/thread/read`,
  );
  return normalizeApiResponse<{ messageId: string; lastReadAt: string }>(
    response.data,
  );
};

export const getThreadMessages = async (
  messageId: string,
): Promise<ApiResponse<ThreadMessagesResponse>> => {
  const response = await api.get(`/api/channels/messages/${messageId}/thread`);
  return normalizeApiResponse<ThreadMessagesResponse>(response.data);
};

export const followThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.post(
    `/api/channels/messages/${messageId}/thread/follow`,
  );
  return normalizeApiResponse<{ following: boolean }>(response.data);
};

export const unfollowThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.post(
    `/api/channels/messages/${messageId}/thread/unfollow`,
  );
  return normalizeApiResponse<{ following: boolean }>(response.data);
};
