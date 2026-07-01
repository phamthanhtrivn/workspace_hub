import { api } from "@/lib/axios";
import { UserSearchResponse } from "../types/chat.types";

export const searchUserByEmail = async (
  email: string,
): Promise<UserSearchResponse[]> => {
  const response = await api.get("/api/users/search", {
    params: { email },
  });
  return response.data?.data || [];
};
