import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  getAvatarPresignedUrl,
  getBulkProfilesByEmails,
  getUserProfile,
  getUserSessions,
  getUserSettings,
  revokeUserSession,
  sendPasswordOtp,
  setFirstPassword,
  updatePassword,
  updateUserSettings,
  updateUserProfile,
} from "../api/user-setting.api";
import {
  USER_SETTING_STALE_TIME_MS,
  UserSettingMutationKey,
  UserSettingQueryKey,
} from "../types/settings.enums";
import {
  ApiResponse,
  UpdateUserSettingsRequest,
  UploadAvatarRequest,
  UserProfile,
  UserSettings,
} from "../types/user-setting.types";

export const userSettingKeys = {
  profile: [UserSettingQueryKey.PROFILE] as const,
  settings: [UserSettingQueryKey.SETTINGS] as const,
  sessions: [UserSettingQueryKey.SESSIONS] as const,
  bulkProfilesByEmails: (emails: string[]) =>
    [UserSettingQueryKey.BULK_PROFILES_BY_EMAILS, emails] as const,
};

export const useUserProfileQuery = () =>
  useQuery({
    queryKey: userSettingKeys.profile,
    queryFn: getUserProfile,
    staleTime: USER_SETTING_STALE_TIME_MS,
  });

export const useUserSettingsQuery = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: userSettingKeys.settings,
    queryFn: getUserSettings,
    enabled: options?.enabled ?? true,
    staleTime: USER_SETTING_STALE_TIME_MS,
  });

export const useUserSessionsQuery = () =>
  useQuery({
    queryKey: userSettingKeys.sessions,
    queryFn: getUserSessions,
    staleTime: USER_SETTING_STALE_TIME_MS,
  });

export const useBulkUserProfilesByEmailsQuery = (emails: string[]) =>
  useQuery({
    queryKey: userSettingKeys.bulkProfilesByEmails(emails),
    queryFn: () => getBulkProfilesByEmails(emails),
    enabled: emails.length > 0,
    staleTime: USER_SETTING_STALE_TIME_MS,
  });

export const useUpdateUserProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UserSettingMutationKey.UPDATE_PROFILE],
    mutationFn: updateUserProfile,
    onSuccess: (response) => {
      queryClient.setQueryData(userSettingKeys.profile, response);
      queryClient.invalidateQueries({ queryKey: userSettingKeys.profile });
    },
  });
};

export const useUpdateUserSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UserSettingMutationKey.UPDATE_SETTINGS],
    mutationFn: updateUserSettings,
    onMutate: async (payload: UpdateUserSettingsRequest) => {
      await queryClient.cancelQueries({ queryKey: userSettingKeys.settings });

      const previousSettings =
        queryClient.getQueryData<ApiResponse<UserSettings>>(
          userSettingKeys.settings,
        );

      queryClient.setQueryData<ApiResponse<UserSettings>>(
        userSettingKeys.settings,
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  ...payload,
                },
              }
            : current,
      );

      return { previousSettings };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(
          userSettingKeys.settings,
          context.previousSettings,
        );
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(userSettingKeys.settings, response);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userSettingKeys.settings });
    },
  });
};

export const useRevokeUserSessionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UserSettingMutationKey.REVOKE_SESSION],
    mutationFn: revokeUserSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSettingKeys.sessions });
    },
  });
};

export const useUploadAvatarMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UserSettingMutationKey.UPLOAD_AVATAR],
    mutationFn: async ({
      file,
      currentProfile,
    }: UploadAvatarRequest): Promise<ApiResponse<UserProfile>> => {
      const presignResponse = await getAvatarPresignedUrl(file.name, file.type);
      const { presignedUrl, fileUrl } = presignResponse.data;

      await axios.put(presignedUrl, file, {
        headers: {
          "Content-Type": file.type,
        },
      });

      return {
        ...presignResponse,
        data: {
          email: currentProfile?.email ?? "",
          fullName: currentProfile?.fullName ?? "",
          phoneNumber: currentProfile?.phoneNumber ?? "",
          dob: currentProfile?.dob ?? "",
          bio: currentProfile?.bio ?? "",
          avatarUrl: fileUrl,
          hasPassword: currentProfile?.hasPassword ?? false,
        },
      };
    },
    onSuccess: (response) => {
      queryClient.setQueryData<ApiResponse<UserProfile>>(
        userSettingKeys.profile,
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  avatarUrl: response.data.avatarUrl,
                },
              }
            : response,
      );
    },
  });
};

export const useSendPasswordOtpMutation = () =>
  useMutation({
    mutationKey: [UserSettingMutationKey.SEND_PASSWORD_OTP],
    mutationFn: sendPasswordOtp,
  });

export const useSetFirstPasswordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UserSettingMutationKey.SET_FIRST_PASSWORD],
    mutationFn: setFirstPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSettingKeys.profile });
    },
  });
};

export const useUpdatePasswordMutation = () =>
  useMutation({
    mutationKey: [UserSettingMutationKey.UPDATE_PASSWORD],
    mutationFn: updatePassword,
  });
