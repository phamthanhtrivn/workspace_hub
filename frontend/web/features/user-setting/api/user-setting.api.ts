import { api } from "@/lib/axios";
import { UserProfile } from "@/features/user-setting/types/user-setting.types";

export const getUserProfile = async (): Promise<any> => {
  const response = await api.get("/api/users/me/profile");
  return response.data;
};

export const updateUserProfile = async (
  profile: Partial<UserProfile>,
): Promise<any> => {
  const response = await api.put("/api/users/me/profile", profile);
  return response.data;
};

export const getAvatarPresignedUrl = async (
  fileName: string,
  contentType: string
): Promise<any> => {
  const response = await api.get("/api/users/me/profile/avatar/presigned-url", {
    params: { fileName, contentType }
  });
  return response.data;
};

export const getUserSessions = async (): Promise<any> => {
  const response = await api.get("/api/users/me/sessions");
  return response.data;
};

export const revokeUserSession = async (
  sessionId: string,
  password?: string
): Promise<any> => {
  const response = await api.delete(`/api/users/me/sessions/${sessionId}`, {
    data: { password: password || "" }
  });
  return response.data;
};
