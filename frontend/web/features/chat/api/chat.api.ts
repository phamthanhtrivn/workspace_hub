import { api } from "@/lib/axios";
import { UserSearchResponse, UserProfileResponse } from "../types/chat.types";

export const searchUserByEmail = async (
  email: string,
): Promise<UserSearchResponse[]> => {
  const response = await api.get("/api/users/search", {
    params: { email },
  });
  return response.data?.data || [];
};

export const createDirectConversation = async (
  participantId: string,
): Promise<any> => {
  const response = await api.post("/api/conversations/direct", {
    participantId,
  });
  return response.data?.data;
};

export const getPublicProfile = async (
  userId: string,
): Promise<UserProfileResponse> => {
  const response = await api.get(`/api/users/${userId}/profile`);
  return response.data?.data;
};
