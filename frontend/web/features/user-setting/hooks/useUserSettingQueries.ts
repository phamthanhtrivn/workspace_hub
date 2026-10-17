import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { store, useAppSelector } from "@/store/store";
import { canApplyAccountTheme } from "../utils/theme-preference";
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
  USER_SETTING_SAVE_ERROR,
  UserSettingMutationKey,
  UserSettingQueryKey,
} from "../types/settings.enums";
import {
  ApiResponse,
  UpdateUserSettingsRequest,
  UploadAvatarRequest,
  UserProfile,
} from "../types/user-setting.types";

export const userSettingKeys = {
  profile: [UserSettingQueryKey.PROFILE] as const,
  settings: (userId: string | null) =>
    [UserSettingQueryKey.SETTINGS, userId] as const,
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

export const useUserSettingsQuery = (options?: { enabled?: boolean }) => {
  const userId = useAppSelector((state) => state.auth.userId);
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  return useQuery({
    queryKey: userSettingKeys.settings(userId),
    queryFn: getUserSettings,
    enabled: !!userId && !!accessToken && (options?.enabled ?? true),
    staleTime: USER_SETTING_STALE_TIME_MS,
  });
};

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
  const userId = useAppSelector((state) => state.auth.userId);

  return useMutation({
    mutationKey: [UserSettingMutationKey.UPDATE_SETTINGS],
    mutationFn: async (payload: UpdateUserSettingsRequest) => {
      const response = await updateUserSettings(payload);
      if (!response.success) {
        throw new Error(response.message || USER_SETTING_SAVE_ERROR);
      }
      return response;
    },
    onMutate: async () => {
      const queryKey = userSettingKeys.settings(userId);
      await queryClient.cancelQueries({ queryKey });
      return { userId, queryKey };
    },
    onSuccess: (response, _payload, context) => {
      // A mutation may finish after an account switch. Do not seed the new session.
      if (
        context &&
        canApplyAccountTheme(context.userId, store.getState().auth.userId, response.data.theme)
      ) {
        queryClient.setQueryData(context.queryKey, response);
      }
    },
    onSettled: (_response, _error, _payload, context) => {
      if (context && context.userId === store.getState().auth.userId) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
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
