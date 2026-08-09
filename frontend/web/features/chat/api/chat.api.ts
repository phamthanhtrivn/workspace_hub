import { api } from "@/lib/axios";
import { UserSearchResponse, UserProfileResponse } from "../types/chat.types";

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

export const createDirectConversation = async (
  participantId: string,
): Promise<any> => {
  const response = await api.post("/api/channels/direct", {
    participantId,
  });
  const payload = response.data;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: normalizeDirectConversation(payload?.data ?? payload),
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


export const getPublicProfile = async (id: string): Promise<any> => {
  const response = await api.get(`/api/users/${id}/profile`);
  return response.data;
};

export const getBulkProfilesByIds = async (ids: string[]): Promise<any> => {
  const response = await api.get("/api/users/profiles/bulk", {
    params: { ids: ids.join(",") },
  });
  return response.data;
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

export const getUserConversations = async (): Promise<any> => {
  const response = await api.get("/api/channels");
  return response.data;
};

export const getConversationMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  direction?: "older" | "newer" | "around",
): Promise<any> => {
  const response = await api.get(
    `/api/channels/${conversationId}/messages`,
    {
      params: { cursor, limit, direction },
    },
  );
  return response.data;
};

export const getConversationMedia = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  mediaType?: string,
): Promise<any> => {
  const response = await api.get(`/api/channels/${conversationId}/media`, {
    params: { cursor, limit, mediaType },
  });
  return response.data;
};

export const getPinnedMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
): Promise<any> => {
  const response = await api.get(
    `/api/channels/${conversationId}/pinned-messages`,
    {
      params: { cursor, limit },
    },
  );
  return response.data;
};

export const searchConversationMessages = async (
  conversationId: string,
  q?: string,
  senderId?: string,
  type?: "TEXT",
): Promise<any> => {
  const response = await api.get(
    `/api/channels/${conversationId}/messages/search`,
    {
      params: { q, senderId, type },
    },
  );
  return response.data;
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
): Promise<any> => {
  const response = await api.patch(
    `/api/channels/${conversationId}/mute`,
    { muted },
  );
  return response.data;
};

export const getThreadMessages = async (
  messageId: string,
): Promise<any> => {
  const response = await api.get(`/api/channels/messages/${messageId}/thread`);
  return response.data;
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
  userIds: string[],
): Promise<any> => {
  const response = await api.post(`/api/spaces/${spaceId}/invite`, { userIds });
  return response.data;
};

export const getConversationThreads = async (
  conversationId: string,
): Promise<any> => {
  const response = await api.get(`/api/channels/messages/${conversationId}/threads`);
  return response.data;
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
