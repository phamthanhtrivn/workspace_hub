import { api } from "@/lib/axios";
import {
  ApiResponse,
  ChatMessageResponse,
  ConversationResponse,
  MuteConversationResponse,
  PaginatedMediaResponse,
  PaginatedMessagesResponse,
  PinnedMessagesResponse,
  ThreadMessagesResponse,
  UserSearchResponse,
  UserProfileResponse,
} from "../types/chat.types";

export const searchUserByEmail = async (email: string): Promise<any> => {
  const response = await api.get("/api/users/search", {
    params: { email },
  });
  return response.data;
};

function normalizeDirectConversation(conversation: any) {
  if (!conversation) return conversation;

  const members = conversation.members || conversation.participants || [];

  return {
    ...conversation,
    type: "DIRECT",
    members: members.map((member: any) => ({
      ...member,
      role: member.role || "MEMBER",
    })),
    setting: conversation.setting || {
      allowSendMessage: true,
      allowCreateNote: true,
      allowCreatePoll: true,
      allowPinMessage: true,
    },
  };
}

function normalizeApiResponse<T>(payload: any): ApiResponse<T> {
  return {
    ...payload,
    success: payload?.success ?? true,
    data: payload?.data ?? payload,
  };
}

export const createDirectConversation = async (
  participantId: string,
): Promise<ApiResponse<ConversationResponse>> => {
  const response = await api.post("/api/direct-conversations", {
    participantId,
  });
  const payload = response.data;
  return {
    ...normalizeApiResponse<ConversationResponse>(payload),
    data: normalizeDirectConversation(payload?.data ?? payload),
  };
};

export const getDirectConversations = async (): Promise<
  ApiResponse<ConversationResponse[]>
> => {
  const response = await api.get("/api/direct-conversations");
  const payload = response.data;
  const conversations = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(conversations)
      ? conversations.map((conversation: any) =>
          normalizeDirectConversation(conversation),
        )
      : [],
  };
};

export const createGroupConversation = async (
  name: string | undefined,
  avatarUrl: string | undefined,
  participantIds: string[],
): Promise<any> => {
  const response = await api.post("/api/channels/group", {
    name,
    avatarUrl,
    participantIds,
  });
  return response.data;
};

export const inviteMembers = async (
  conversationId: string,
  memberIds: string[],
): Promise<any> => {
  const response = await api.post(
    `/api/channels/${conversationId}/members/invite`,
    { memberIds },
  );
  return response.data;
};

export const updateGroupInfo = async (
  conversationId: string,
  name?: string,
  avatarUrl?: string,
): Promise<any> => {
  const response = await api.patch(`/api/channels/${conversationId}/info`, {
    name,
    avatarUrl,
  });
  return response.data;
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

export const getBulkProfilesByIds = async (
  ids: string[],
): Promise<ApiResponse<UserProfileResponse[]>> => {
  const response = await api.get("/api/users/profiles/bulk", {
    params: { ids: ids.join(",") },
  });
  const payload = response.data;
  const profiles = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(profiles) ? profiles : [],
  };
};

export const getPendingInvitations = async (): Promise<any> => {
  const response = await api.get("/api/invitations/pending");
  return response.data;
};

export const acceptInvitation = async (invitationId: string): Promise<any> => {
  const response = await api.post(`/api/invitations/${invitationId}/accept`);
  return response.data;
};

export const declineInvitation = async (invitationId: string): Promise<any> => {
  const response = await api.post(`/api/invitations/${invitationId}/decline`);
  return response.data;
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
      ? conversations.map((conversation: any) =>
          conversation.type === "DIRECT" || conversation.participants
            ? normalizeDirectConversation(conversation)
            : conversation,
        )
      : [],
  };
};

export const getConversationMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  direction?: "older" | "newer" | "around",
): Promise<ApiResponse<PaginatedMessagesResponse>> => {
  const response = await api.get(
    `/api/channels/${conversationId}/messages`,
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
): Promise<ApiResponse<any>> => {
  const response = await api.post(
    `/api/direct-conversations/${conversationId}/messages/read`,
    { messageId },
  );
  return normalizeApiResponse<any>(response.data);
};

export const getConversationMedia = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  mediaType?: string,
): Promise<ApiResponse<PaginatedMediaResponse>> => {
  const response = await api.get(`/api/channels/${conversationId}/media`, {
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
  conversationId: string,
  cursor?: string,
  limit?: number,
): Promise<ApiResponse<PinnedMessagesResponse>> => {
  const response = await api.get(
    `/api/channels/${conversationId}/pinned-messages`,
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
): Promise<ApiResponse<any>> => {
  const response = await api.delete(
    `/api/direct-conversations/messages/${messageId}/reactions`,
    { data: { emoji } },
  );
  return normalizeApiResponse<any>(response.data);
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

export const searchConversationMessages = async (
  conversationId: string,
  q?: string,
  senderId?: string,
  type?: "TEXT",
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(
    `/api/channels/${conversationId}/messages/search`,
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

export const updateConversationSettings = async (
  conversationId: string,
  settings: any,
): Promise<any> => {
  const response = await api.patch(
    `/api/channels/${conversationId}/settings`,
    settings,
  );
  return response.data;
};

export const updateMemberRole = async (
  conversationId: string,
  memberId: string,
  role: "ADMIN" | "MEMBER",
): Promise<any> => {
  const response = await api.put(
    `/api/channels/${conversationId}/members/${memberId}/role`,
    { role },
  );
  return response.data;
};

export const transferOwnership = async (
  conversationId: string,
  newOwnerId: string,
): Promise<any> => {
  const response = await api.post(
    `/api/channels/${conversationId}/transfer-owner`,
    { newOwnerId },
  );
  return response.data;
};

export const kickMember = async (
  conversationId: string,
  memberId: string,
): Promise<any> => {
  const response = await api.delete(
    `/api/channels/${conversationId}/members/${memberId}`,
  );
  return response.data;
};

export const leaveConversation = async (
  conversationId: string,
): Promise<any> => {
  const response = await api.delete(`/api/channels/${conversationId}/leave`);
  return response.data;
};

export const disbandConversation = async (
  conversationId: string,
): Promise<any> => {
  const response = await api.delete(`/api/channels/${conversationId}/disband`);
  return response.data;
};

export const getGroupAvatarPresignedUrl = async (
  conversationId: string,
  fileName: string,
  contentType: string,
): Promise<any> => {
  const response = await api.get(
    `/api/channels/${conversationId}/avatar/presigned-url`,
    {
      params: { fileName, contentType },
    },
  );
  return response.data;
};

export const muteConversation = async (
  conversationId: string,
  muted: boolean,
): Promise<ApiResponse<MuteConversationResponse>> => {
  const response = await api.patch(
    `/api/channels/${conversationId}/mute`,
    { muted },
  );
  return normalizeApiResponse<MuteConversationResponse>(response.data);
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
): Promise<ApiResponse<any>> => {
  const response = await api.patch(
    `/api/direct-conversations/${conversationId}/pin`,
    { pinned },
  );
  return normalizeApiResponse<any>(response.data);
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
): Promise<any> => {
  const response = await api.post("/api/spaces", { name });
  return response.data;
};

export const getUserSpaces = async (): Promise<any> => {
  const response = await api.get("/api/spaces");
  return response.data;
};

export const createChannel = async (
  spaceId: string,
  name: string,
): Promise<any> => {
  const response = await api.post(`/api/spaces/${spaceId}/channels`, { name });
  return response.data;
};

export const getSpaceChannels = async (
  spaceId: string,
): Promise<any> => {
  const response = await api.get(`/api/spaces/${spaceId}/channels`);
  return response.data;
};

export const inviteSpaceMembers = async (
  spaceId: string,
  invitees: Pick<UserSearchResponse, "id" | "fullName" | "avatarUrl">[],
): Promise<any> => {
  const response = await api.post(`/api/spaces/${spaceId}/invite`, {
    invitees: invitees.map((user) => ({
      userId: user.id,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    })),
  });
  return response.data;
};

export const getConversationThreads = async (
  conversationId: string,
): Promise<ApiResponse<ChatMessageResponse[]>> => {
  const response = await api.get(`/api/channels/messages/${conversationId}/threads`);
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

export const followThread = async (
  messageId: string,
): Promise<any> => {
  const response = await api.post(`/api/channels/messages/${messageId}/thread/follow`);
  return response.data;
};

export const unfollowThread = async (
  messageId: string,
): Promise<any> => {
  const response = await api.post(`/api/channels/messages/${messageId}/thread/unfollow`);
  return response.data;
};
