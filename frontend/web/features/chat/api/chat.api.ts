import { api } from "@/lib/axios";
import { UserSearchResponse, UserProfileResponse } from "../types/chat.types";

export const searchUserByEmail = async (email: string): Promise<any> => {
  const response = await api.get("/api/users/search", {
    params: { email },
  });
  return response.data;
};

export const createDirectConversation = async (
  participantId: string,
): Promise<any> => {
  const response = await api.post("/api/conversations/direct", {
    participantId,
  });
  return response.data;
};

export const createGroupConversation = async (
  name: string | undefined,
  avatarUrl: string | undefined,
  participantIds: string[],
): Promise<any> => {
  const response = await api.post("/api/conversations/group", {
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
    `/api/conversations/${conversationId}/members/invite`,
    { memberIds },
  );
  return response.data;
};

export const updateGroupInfo = async (
  conversationId: string,
  name?: string,
  avatarUrl?: string,
): Promise<any> => {
  const response = await api.patch(`/api/conversations/${conversationId}/info`, {
    name,
    avatarUrl,
  });
  return response.data;
};


export const getPublicProfile = async (id: string): Promise<any> => {
  const response = await api.get(`/api/users/${id}/profile`);
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
  const response = await api.get("/api/conversations");
  return response.data;
};

export const getConversationMessages = async (
  conversationId: string,
  cursor?: string,
  limit?: number,
  direction?: "older" | "newer" | "around",
): Promise<any> => {
  const response = await api.get(
    `/api/conversations/${conversationId}/messages`,
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
): Promise<any> => {
  const response = await api.get(`/api/conversations/${conversationId}/media`, {
    params: { cursor, limit },
  });
  return response.data;
};

export const getPinnedMessages = async (
  conversationId: string,
): Promise<any> => {
  const response = await api.get(
    `/api/conversations/${conversationId}/pinned-messages`,
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
    `/api/conversations/${conversationId}/messages/search`,
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
    `/api/conversations/${conversationId}/settings`,
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
    `/api/conversations/${conversationId}/members/${memberId}/role`,
    { role },
  );
  return response.data;
};

export const transferOwnership = async (
  conversationId: string,
  newOwnerId: string,
): Promise<any> => {
  const response = await api.post(
    `/api/conversations/${conversationId}/transfer-owner`,
    { newOwnerId },
  );
  return response.data;
};

export const kickMember = async (
  conversationId: string,
  memberId: string,
): Promise<any> => {
  const response = await api.delete(
    `/api/conversations/${conversationId}/members/${memberId}`,
  );
  return response.data;
};

export const leaveConversation = async (
  conversationId: string,
): Promise<any> => {
  const response = await api.delete(`/api/conversations/${conversationId}/leave`);
  return response.data;
};

export const disbandConversation = async (
  conversationId: string,
): Promise<any> => {
  const response = await api.delete(`/api/conversations/${conversationId}/disband`);
  return response.data;
};
