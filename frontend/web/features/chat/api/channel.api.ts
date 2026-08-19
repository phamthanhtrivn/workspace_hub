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

const CHANNEL_API_ROUTES = {
  channelMembers: (channelId: string) => `/api/channels/${channelId}/members`,
  channelMessages: (channelId: string) => `/api/channels/${channelId}/messages`,
  channelMedia: (channelId: string) => `/api/channels/${channelId}/media`,
  channelPinned: (channelId: string) => `/api/channels/${channelId}/pinned-messages`,
  channelSettings: (channelId: string) => `/api/channels/${channelId}/settings`,
  channelAvatar: (channelId: string) => `/api/channels/${channelId}/avatar/presigned-url`,
  channelMute: (channelId: string) => `/api/channels/${channelId}/mute`,
  channelPin: (channelId: string) => `/api/channels/${channelId}/pin`,
  channelMemberRole: (channelId: string, memberId: string) =>
    `/api/channels/${channelId}/members/${memberId}/role`,
  channelMemberKick: (channelId: string, memberId: string) =>
    `/api/channels/${channelId}/members/${memberId}`,
  channelLeave: (channelId: string) => `/api/channels/${channelId}/leave`,
  channelDisband: (channelId: string) => `/api/channels/${channelId}/disband`,
  channelJoin: (channelId: string) => `/api/channels/${channelId}/join`,
  channelInvite: (channelId: string) => `/api/channels/${channelId}/members/invite`,
  channelInfo: (channelId: string) => `/api/channels/${channelId}/info`,
  channelMessageSearch: (channelId: string) => `/api/channels/${channelId}/messages/search`,
  channelThreads: (channelId: string) => `/api/channels/messages/${channelId}/threads`,
  channelFollowedThreads: "/api/channels/threads/followed",
  channelThreadRead: (messageId: string) =>
    `/api/channels/messages/${messageId}/thread/read`,
  channelThreadFollow: (messageId: string) =>
    `/api/channels/messages/${messageId}/thread/follow`,
  channelThreadUnfollow: (messageId: string) =>
    `/api/channels/messages/${messageId}/thread/unfollow`,
  channelThreadMessages: (messageId: string) =>
    `/api/channels/messages/${messageId}/thread`,
} as const;

// ─── Channel Members ───────────────────────────────────────────────────────

export const getChannelMembers = async (
  channelId: string,
  search?: string,
  limit?: number,
): Promise<ApiResponse<ChannelMembersListResponse>> => {
  const response = await api.get(CHANNEL_API_ROUTES.channelMembers(channelId), {
    params: { search, limit },
  });
  return normalizeApiResponse<ChannelMembersListResponse>(response.data);
};

export const inviteMembers = async (
  channelId: string,
  memberIds: string[],
): Promise<ApiResponse<unknown>> => {
  const response = await api.post(CHANNEL_API_ROUTES.channelInvite(channelId), {
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
    CHANNEL_API_ROUTES.channelMemberRole(channelId, memberId),
    { role },
  );
  return normalizeApiResponse<ConversationMember>(response.data);
};

export const kickMember = async (
  channelId: string,
  memberId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(
    CHANNEL_API_ROUTES.channelMemberKick(channelId, memberId),
  );
  return normalizeApiResponse<unknown>(response.data);
};

export const leaveChannel = async (
  channelId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(CHANNEL_API_ROUTES.channelLeave(channelId));
  return normalizeApiResponse<unknown>(response.data);
};

export const disbandChannel = async (
  channelId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(CHANNEL_API_ROUTES.channelDisband(channelId));
  return normalizeApiResponse<unknown>(response.data);
};

export const joinChannel = async (
  channelId: string,
): Promise<ApiResponse<ChannelResponse>> => {
  const response = await api.post(CHANNEL_API_ROUTES.channelJoin(channelId));
  return normalizeApiResponse<ChannelResponse>(response.data);
};

// ─── Channel Info & Settings ───────────────────────────────────────────────

export const updateChannelInfo = async (
  channelId: string,
  name: string,
): Promise<ApiResponse<ChannelResponse>> => {
  const response = await api.patch(CHANNEL_API_ROUTES.channelInfo(channelId), {
    name,
  });
  return normalizeApiResponse<ChannelResponse>(response.data);
};

export const updateChannelSettings = async (
  channelId: string,
  settings: Partial<ConversationSetting>,
): Promise<ApiResponse<ConversationSetting>> => {
  const response = await api.patch(
    CHANNEL_API_ROUTES.channelSettings(channelId),
    settings,
  );
  return normalizeApiResponse<ConversationSetting>(response.data);
};

export const getChannelAvatarPresignedUrl = async (
  channelId: string,
  fileName: string,
  contentType: string,
): Promise<ApiResponse<{ presignedUrl: string; fileUrl?: string }>> => {
  const response = await api.get(CHANNEL_API_ROUTES.channelAvatar(channelId), {
    params: { fileName, contentType },
  });
  return normalizeApiResponse<{ presignedUrl: string; fileUrl?: string }>(
    response.data,
  );
};

export const muteChannel = async (
  channelId: string,
  muted: boolean,
): Promise<ApiResponse<MuteConversationResponse>> => {
  const response = await api.patch(CHANNEL_API_ROUTES.channelMute(channelId), {
    muted,
  });
  return normalizeApiResponse<MuteConversationResponse>(response.data);
};

export const pinChannel = async (
  channelId: string,
  pinned: boolean,
): Promise<ApiResponse<{ pinned: boolean }>> => {
  const response = await api.patch(CHANNEL_API_ROUTES.channelPin(channelId), {
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
  const response = await api.get(CHANNEL_API_ROUTES.channelMessages(channelId), {
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
  const response = await api.get(
    CHANNEL_API_ROUTES.channelMessageSearch(channelId),
    { params: { q, senderId, type } },
  );
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
  const response = await api.get(CHANNEL_API_ROUTES.channelMedia(channelId), {
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
  const response = await api.get(CHANNEL_API_ROUTES.channelPinned(channelId), {
    params: { cursor, limit, q },
  });
  return normalizeApiResponse<PinnedMessagesResponse>(response.data);
};

// ─── Channel Threads ───────────────────────────────────────────────────────

export const getChannelThreads = async (
  channelId: string,
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(CHANNEL_API_ROUTES.channelThreads(channelId));
  return normalizeApiResponse<ChatMessageResponse[]>(response.data);
};

export const getFollowedChannelThreads = async (): Promise<
  ApiResponse<FollowedThreadResponse[]>
> => {
  const response = await api.get(CHANNEL_API_ROUTES.channelFollowedThreads);
  return normalizeApiResponse<FollowedThreadResponse[]>(response.data);
};

export const markChannelThreadAsRead = async (
  messageId: string,
): Promise<ApiResponse<{ messageId: string; lastReadAt: string }>> => {
  const response = await api.post(CHANNEL_API_ROUTES.channelThreadRead(messageId));
  return normalizeApiResponse<{ messageId: string; lastReadAt: string }>(
    response.data,
  );
};

export const getThreadMessages = async (
  messageId: string,
): Promise<ApiResponse<ThreadMessagesResponse>> => {
  const response = await api.get(
    CHANNEL_API_ROUTES.channelThreadMessages(messageId),
  );
  return normalizeApiResponse<ThreadMessagesResponse>(response.data);
};

export const followThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.post(
    CHANNEL_API_ROUTES.channelThreadFollow(messageId),
  );
  return normalizeApiResponse<{ following: boolean }>(response.data);
};

export const unfollowThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.post(
    CHANNEL_API_ROUTES.channelThreadUnfollow(messageId),
  );
  return normalizeApiResponse<{ following: boolean }>(response.data);
};
