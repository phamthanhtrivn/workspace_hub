import { api } from "@/lib/axios";
import type { ApiResponse } from "@/lib/api-response";

export interface UserSearchResult {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export async function searchUsersByEmail(
  email: string,
): Promise<UserSearchResult[]> {
  const response = await api.get<ApiResponse<UserSearchResult[]>>(
    "/api/users/search",
    { params: { email } },
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Không thể tìm người dùng");
  }

  return response.data.data || [];
}
