import { api } from "@/lib/axios";
import { UserSearchResponse, UserProfileResponse } from "../types/chat.types";

export const searchUserByEmail = async (
  email: string,
): Promise<any> => {
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

export const getPublicProfile = async (
  userId: string,
): Promise<any> => {
  const response = await api.get(`/api/users/${userId}/profile`);
  return response.data;
};

export const getUserConversations = async (): Promise<any> => {
  const response = await api.get("/api/conversations");
  return response.data;
};

export const getConversationMessages = async (
  conversationId: string,
): Promise<any> => {
  const response = await api.get(
    `/api/conversations/${conversationId}/messages`,
  );
  return response.data;
};
