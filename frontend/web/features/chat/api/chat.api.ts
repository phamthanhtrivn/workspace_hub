import { api } from "@/lib/axios";
import {
  ApiResponse,
  ChatMessageResponse,
  ChannelMembersListResponse,
  ChannelResponse,
  ConversationMember,
  ConversationResponse,
  ConversationSetting,
  DirectConversationResponse,
  FollowedThreadResponse,
  MuteConversationResponse,
  PaginatedMediaResponse,
  PaginatedMessagesResponse,
  PinnedMessagesResponse,
  SpaceInvitation,
  SpaceMembersListResponse,
  SpaceResponse,
  SpaceSettingResponse,
  ThreadMessagesResponse,
  UserSearchResponse,
  UserProfileResponse,
} from "../types/chat.types";

type UnknownRecord = Record<string, unknown>;

const CHAT_API_ROUTES = {
  channelMembers: (channelId: string) => `/api/channels/${channelId}/members`,
  channelFollowedThreads: "/api/channels/threads/followed",
  directFollowedThreads: "/api/direct-conversations/threads/followed",
  channelThreadRead: (messageId: string) =>
    `/api/channels/messages/${messageId}/thread/read`,
  directThreadRead: (messageId: string) =>
    `/api/direct-conversations/messages/${messageId}/thread/read`,
} as const;

type RawDirectConversation = Partial<DirectConversationResponse> &
  UnknownRecord & {
    participants?: ConversationMember[];
    members?: ConversationMember[];
    setting?: ConversationSetting | null;
  };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export const searchUserByEmail = async (
  email: string,
): Promise<ApiResponse<UserSearchResponse[]>> => {
  const response = await api.get("/api/users/search", {
    params: { email },
  });
  const payload = normalizeApiResponse<UserSearchResponse[] | UserSearchResponse>(
    response.data,
  );
  return {
    ...payload,
    data: Array.isArray(payload.data) ? payload.data : [payload.data],
  };
};

function normalizeDirectConversation(
  conversation: RawDirectConversation,
): DirectConversationResponse {
  if (!conversation) return conversation;

  const members = conversation.members || conversation.participants || [];

  return {
    ...conversation,
    members: members.map((member) => ({
      ...member,
      role: member.role || "MEMBER",
    })),
    setting: conversation.setting || {
      allowSendMessage: true,
      allowCreateNote: true,
      allowCreatePoll: true,
      allowPinMessage: true,
    },
  } as DirectConversationResponse;
}

function normalizeApiResponse<T>(payload: unknown): ApiResponse<T> {
  const responsePayload = isRecord(payload) ? payload : {};
  const data =
    isRecord(payload) && "data" in payload ? payload.data : payload;
  return {
    ...responsePayload,
    success:
      typeof responsePayload.success === "boolean"
        ? responsePayload.success
        : true,
    data: data as T,
  };
}

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
): Promise<
  ApiResponse<DirectConversationResponse[]>
> => {
  const response = await api.get("/api/direct-conversations", {
    params: { search: search || undefined },
  });
  const payload = response.data;
  const conversations = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(conversations)
      ? conversations.map((conversation: RawDirectConversation) =>
          normalizeDirectConversation(conversation),
        )
      : [],
  };
};

export const inviteMembers = async (
  channelId: string,
  memberIds: string[],
): Promise<ApiResponse<unknown>> => {
  const response = await api.post(
    `/api/channels/${channelId}/members/invite`,
    { memberIds },
  );
  return normalizeApiResponse<unknown>(response.data);
};

export const getChannelMembers = async (
  channelId: string,
  search?: string,
  limit?: number,
): Promise<ApiResponse<ChannelMembersListResponse>> => {
  const response = await api.get(CHAT_API_ROUTES.channelMembers(channelId), {
    params: { search, limit },
  });
  return normalizeApiResponse<ChannelMembersListResponse>(response.data);
};

export const updateChannelInfo = async (
  channelId: string,
  name: string,
): Promise<ApiResponse<ChannelResponse>> => {
  const response = await api.patch(`/api/channels/${channelId}/info`, {
    name,
  });
  return normalizeApiResponse<ChannelResponse>(response.data);
};


export const getPublicProfile = async (
  id: string,
): Promise<ApiResponse<UserProfileResponse>> => {
  const response = await api.get(`/api/users/${id}/profile`);
  const payload = response.data;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: payload?.data ?? payload,
  };
};

export const getPendingInvitations = async (): Promise<
  ApiResponse<SpaceInvitation[]>
> => {
  const response = await api.get("/api/invitations/pending");
  return normalizeApiResponse<SpaceInvitation[]>(response.data);
};

export const acceptInvitation = async (
  invitationId: string,
): Promise<ApiResponse<SpaceInvitation | ChannelResponse>> => {
  const response = await api.post(`/api/invitations/${invitationId}/accept`);
  return normalizeApiResponse<SpaceInvitation | ChannelResponse>(
    response.data,
  );
};

export const declineInvitation = async (
  invitationId: string,
): Promise<ApiResponse<SpaceInvitation>> => {
  const response = await api.post(`/api/invitations/${invitationId}/decline`);
  return normalizeApiResponse<SpaceInvitation>(response.data);
};

export const getUserConversations = async (): Promise<
  ApiResponse<ConversationResponse[]>
> => {
  const response = await api.get("/api/channels");
  const payload = response.data;
  const conversations = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(conversations)
      ? conversations.map((conversation: RawDirectConversation) =>
          conversation.participants
            ? normalizeDirectConversation(conversation)
            : (conversation as unknown as ChannelResponse),
        )
      : [],
  };
};

export const getChannelMessages = async (
  channelId: string,
  cursor?: string,
  limit?: number,
  direction?: "older" | "newer" | "around",
): Promise<ApiResponse<PaginatedMessagesResponse>> => {
  const response = await api.get(
    `/api/channels/${channelId}/messages`,
    {
      params: { cursor, limit, direction },
    },
  );
  return normalizeApiResponse<PaginatedMessagesResponse>(response.data);
};

export const getDirectConversationMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  direction?: "older" | "newer" | "around",
): Promise<ApiResponse<PaginatedMessagesResponse>> => {
  const response = await api.get(
    `/api/direct-conversations/${conversationId}/messages`,
    {
      params: { cursor, limit, direction },
    },
  );
  return normalizeApiResponse<PaginatedMessagesResponse>(response.data);
};

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
    `/api/direct-conversations/${conversationId}/messages`,
    payload,
  );
  return normalizeApiResponse<ChatMessageResponse>(response.data);
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

export const getChannelMedia = async (
  channelId: string,
  cursor?: string,
  limit?: number,
  mediaType?: string,
): Promise<ApiResponse<PaginatedMediaResponse>> => {
  const response = await api.get(`/api/channels/${channelId}/media`, {
    params: { cursor, limit, mediaType },
  });
  return normalizeApiResponse<PaginatedMediaResponse>(response.data);
};

export const getDirectConversationMedia = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  mediaType?: string,
): Promise<ApiResponse<PaginatedMediaResponse>> => {
  const response = await api.get(`/api/direct-conversations/${conversationId}/media`, {
    params: { cursor, limit, mediaType },
  });
  return normalizeApiResponse<PaginatedMediaResponse>(response.data);
};

export const getPinnedMessages = async (
  channelId: string,
  cursor?: string,
  limit?: number,
): Promise<ApiResponse<PinnedMessagesResponse>> => {
  const response = await api.get(
    `/api/channels/${channelId}/pinned-messages`,
    {
      params: { cursor, limit },
    },
  );
  return normalizeApiResponse<PinnedMessagesResponse>(response.data);
};

export const getDirectPinnedMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  senderId?: string,
): Promise<ApiResponse<PinnedMessagesResponse>> => {
  const response = await api.get(
    `/api/direct-conversations/${conversationId}/pinned-messages`,
    {
      params: { cursor, limit, senderId },
    },
  );
  return normalizeApiResponse<PinnedMessagesResponse>(response.data);
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

export const addDirectReaction = async (
  messageId: string,
  emoji: string,
): Promise<ApiResponse<{ action: "add" | "remove" | "update"; emoji: string }>> => {
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

export const searchChannelMessages = async (
  channelId: string,
  q?: string,
  senderId?: string,
  type?: "TEXT",
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(
    `/api/channels/${channelId}/messages/search`,
    {
      params: { q, senderId, type },
    },
  );
  return normalizeApiResponse<ChatMessageResponse[]>(response.data);
};

export const searchDirectConversationMessages = async (
  conversationId: string,
  q?: string,
  senderId?: string,
  type?: "TEXT",
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(
    `/api/direct-conversations/${conversationId}/messages/search`,
    {
      params: { q, senderId, type },
    },
  );
  return normalizeApiResponse<ChatMessageResponse[]>(response.data);
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

export const getChannelAvatarPresignedUrl = async (
  channelId: string,
  fileName: string,
  contentType: string,
): Promise<ApiResponse<{ presignedUrl: string; fileUrl?: string }>> => {
  const response = await api.get(
    `/api/channels/${channelId}/avatar/presigned-url`,
    {
      params: { fileName, contentType },
    },
  );
  return normalizeApiResponse<{ presignedUrl: string; fileUrl?: string }>(
    response.data,
  );
};

export const muteChannel = async (
  channelId: string,
  muted: boolean,
): Promise<ApiResponse<MuteConversationResponse>> => {
  const response = await api.patch(
    `/api/channels/${channelId}/mute`,
    { muted },
  );
  return normalizeApiResponse<MuteConversationResponse>(response.data);
};

export const pinChannel = async (
  channelId: string,
  pinned: boolean,
): Promise<ApiResponse<{ pinned: boolean }>> => {
  const response = await api.patch(
    `/api/channels/${channelId}/pin`,
    { pinned },
  );
  return normalizeApiResponse<{ pinned: boolean }>(response.data);
};

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

export const getThreadMessages = async (
  messageId: string,
): Promise<ApiResponse<ThreadMessagesResponse>> => {
  const response = await api.get(`/api/channels/messages/${messageId}/thread`);
  return normalizeApiResponse<ThreadMessagesResponse>(response.data);
};

export const getDirectThreadMessages = async (
  messageId: string,
): Promise<ApiResponse<ThreadMessagesResponse>> => {
  const response = await api.get(`/api/direct-conversations/messages/${messageId}/thread`);
  return normalizeApiResponse<ThreadMessagesResponse>(response.data);
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

export const createSpace = async (
  name: string,
): Promise<ApiResponse<SpaceResponse>> => {
  const response = await api.post("/api/spaces", { name });
  return normalizeApiResponse<SpaceResponse>(response.data);
};

export const getUserSpaces = async (): Promise<ApiResponse<SpaceResponse[]>> => {
  const response = await api.get("/api/spaces");
  const payload = response.data;
  const spaces = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(spaces) ? spaces : [],
  };
};

export const getSpaceDetails = async (
  spaceId: string,
): Promise<ApiResponse<SpaceResponse>> => {
  const response = await api.get(`/api/spaces/${spaceId}`);
  return normalizeApiResponse<SpaceResponse>(response.data);
};

export const updateSpace = async (
  spaceId: string,
  name: string,
): Promise<ApiResponse<SpaceResponse>> => {
  const response = await api.patch(`/api/spaces/${spaceId}`, { name });
  return normalizeApiResponse<SpaceResponse>(response.data);
};

export const updateSpaceSettings = async (
  spaceId: string,
  settings: Partial<SpaceSettingResponse>,
): Promise<ApiResponse<SpaceSettingResponse>> => {
  const response = await api.patch(`/api/spaces/${spaceId}/settings`, settings);
  return normalizeApiResponse<SpaceSettingResponse>(response.data);
};

export const getSpaceMembers = async (
  spaceId: string,
  search?: string,
  limit?: number,
): Promise<ApiResponse<SpaceMembersListResponse>> => {
  const response = await api.get(`/api/spaces/${spaceId}/members`, {
    params: { search: search || undefined, limit },
  });
  return normalizeApiResponse<SpaceMembersListResponse>(response.data);
};

export const updateSpaceMemberRole = async (
  spaceId: string,
  memberId: string,
  role: "ADMIN" | "MEMBER",
): Promise<ApiResponse<ConversationMember>> => {
  const response = await api.patch(
    `/api/spaces/${spaceId}/members/${memberId}/role`,
    { role },
  );
  return normalizeApiResponse<ConversationMember>(response.data);
};

export const removeSpaceMember = async (
  spaceId: string,
  memberId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(`/api/spaces/${spaceId}/members/${memberId}`);
  return normalizeApiResponse<unknown>(response.data);
};

export const leaveSpace = async (
  spaceId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(`/api/spaces/${spaceId}/leave`);
  return normalizeApiResponse<unknown>(response.data);
};

export const deleteSpace = async (
  spaceId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(`/api/spaces/${spaceId}`);
  return normalizeApiResponse<unknown>(response.data);
};

export const createChannel = async (
  spaceId: string,
  name: string,
): Promise<ApiResponse<ChannelResponse>> => {
  const response = await api.post(`/api/spaces/${spaceId}/channels`, { name });
  return normalizeApiResponse<ChannelResponse>(response.data);
};

export const getSpaceChannels = async (
  spaceId: string,
  search?: string,
): Promise<ApiResponse<ChannelResponse[]>> => {
  const response = await api.get(`/api/spaces/${spaceId}/channels`, {
    params: { search: search || undefined },
  });
  const payload = response.data;
  const channels = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(channels) ? channels : [],
  };
};

export const inviteSpaceMembers = async (
  spaceId: string,
  invitees: Pick<UserSearchResponse, "id" | "fullName" | "avatarUrl">[],
): Promise<ApiResponse<SpaceInvitation[]>> => {
  const response = await api.post(`/api/spaces/${spaceId}/invite`, {
    invitees: invitees.map((user) => ({
      userId: user.id,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    })),
  });
  return normalizeApiResponse<SpaceInvitation[]>(response.data);
};

export const getSpaceInvitations = async (
  spaceId: string,
): Promise<ApiResponse<SpaceInvitation[]>> => {
  const response = await api.get(`/api/spaces/${spaceId}/invitations`);
  return normalizeApiResponse<SpaceInvitation[]>(response.data);
};

export const cancelSpaceInvitation = async (
  spaceId: string,
  invitationId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(
    `/api/spaces/${spaceId}/invitations/${invitationId}`,
  );
  return normalizeApiResponse<unknown>(response.data);
};

export const resendSpaceInvitation = async (
  spaceId: string,
  invitationId: string,
): Promise<ApiResponse<SpaceInvitation>> => {
  const response = await api.post(
    `/api/spaces/${spaceId}/invitations/${invitationId}/resend`,
  );
  return normalizeApiResponse<SpaceInvitation>(response.data);
};

export const getChannelThreads = async (
  channelId: string,
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(`/api/channels/messages/${channelId}/threads`);
  return normalizeApiResponse<ChatMessageResponse[]>(response.data);
};

export const getDirectConversationThreads = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  senderId?: string,
): Promise<ApiResponse<PaginatedMessagesResponse>> => {
  const response = await api.get(`/api/direct-conversations/${conversationId}/threads`, {
    params: { cursor, limit, senderId },
  });
  return normalizeApiResponse<PaginatedMessagesResponse>(response.data);
};

export const getFollowedChannelThreads = async (): Promise<
  ApiResponse<FollowedThreadResponse[]>
> => {
  const response = await api.get(CHAT_API_ROUTES.channelFollowedThreads);
  return normalizeApiResponse<FollowedThreadResponse[]>(response.data);
};

export const getFollowedDirectThreads = async (): Promise<
  ApiResponse<FollowedThreadResponse[]>
> => {
  const response = await api.get(CHAT_API_ROUTES.directFollowedThreads);
  return normalizeApiResponse<FollowedThreadResponse[]>(response.data);
};

export const markChannelThreadAsRead = async (
  messageId: string,
): Promise<ApiResponse<{ messageId: string; lastReadAt: string }>> => {
  const response = await api.post(CHAT_API_ROUTES.channelThreadRead(messageId));
  return normalizeApiResponse<{ messageId: string; lastReadAt: string }>(
    response.data,
  );
};

export const markDirectThreadAsRead = async (
  messageId: string,
): Promise<ApiResponse<{ messageId: string; lastReadAt: string }>> => {
  const response = await api.post(CHAT_API_ROUTES.directThreadRead(messageId));
  return normalizeApiResponse<{ messageId: string; lastReadAt: string }>(
    response.data,
  );
};

export const followThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.post(`/api/channels/messages/${messageId}/thread/follow`);
  return normalizeApiResponse<{ following: boolean }>(response.data);
};

export const unfollowThread = async (
  messageId: string,
): Promise<ApiResponse<{ following: boolean }>> => {
  const response = await api.post(`/api/channels/messages/${messageId}/thread/unfollow`);
  return normalizeApiResponse<{ following: boolean }>(response.data);
};

export const joinChannel = async (
  channelId: string,
): Promise<ApiResponse<ChannelResponse>> => {
  const response = await api.post(`/api/channels/${channelId}/join`);
  return normalizeApiResponse<ChannelResponse>(response.data);
};
