import { api } from "@/lib/axios";

export interface UserSearchResult {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
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
