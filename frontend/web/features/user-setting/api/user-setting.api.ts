import { api } from "@/lib/axios";
import {
  ApiResponse,
  AvatarPresignedUrlResponse,
  BulkUserProfileResponse,
  RevokeUserSessionRequest,
  UpdatePrivacySettingsRequest,
  UpdateUserProfileRequest,
  UserProfile,
  UserSession,
  UserSettings,
} from "@/features/user-setting/types/user-setting.types";

export const getUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  const response = await api.get("/api/users/me/profile");
  return response.data;
};

export const updateUserProfile = async (
  profile: UpdateUserProfileRequest,
): Promise<ApiResponse<UserProfile>> => {
  const response = await api.put("/api/users/me/profile", profile);
  return response.data;
};

export const getAvatarPresignedUrl = async (
  fileName: string,
  contentType: string,
): Promise<ApiResponse<AvatarPresignedUrlResponse>> => {
  const response = await api.get("/api/users/me/profile/avatar/presigned-url", {
    params: { fileName, contentType },
  });
  return response.data;
};

export const getUserSettings = async (): Promise<ApiResponse<UserSettings>> => {
  const response = await api.get("/api/users/me/settings");
  return response.data;
};

export const updatePrivacySettings = async (
  data: UpdatePrivacySettingsRequest,
): Promise<ApiResponse<UserSettings>> => {
  const response = await api.put("/api/users/me/settings/privacy", data);
  return response.data;
};

export const getUserSessions = async (): Promise<
  ApiResponse<UserSession[]>
> => {
  const response = await api.get("/api/users/me/sessions");
  return response.data;
};

export const revokeUserSession = async ({
  sessionId,
  password,
}: RevokeUserSessionRequest): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/api/users/me/sessions/${sessionId}`, {
    data: { password: password || "" },
  });
  return response.data;
};

export const getBulkProfilesByEmails = async (
  emails: string[],
): Promise<ApiResponse<BulkUserProfileResponse[]>> => {
  const response = await api.get("/api/users/profiles/bulk", {
    params: { emails: emails.join(",") },
  });
  return response.data;
};
