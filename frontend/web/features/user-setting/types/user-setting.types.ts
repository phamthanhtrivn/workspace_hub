import {
  UserLanguage,
  UserTheme,
  UserTimezone,
} from "./settings.enums";

export type ApiValidationErrors = Record<string, string>;

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: ApiValidationErrors;
}

export interface UserSettingErrorResponse {
  message?: string;
  errors?: ApiValidationErrors;
}

export type UserProfile = {
  email: string;
  fullName: string;
  avatarUrl: string;
  phoneNumber: string;
  dob: string;
  bio: string;
};

export type UserSettings = {
  theme: UserTheme;
  language: UserLanguage;
  timezone: UserTimezone;
  emailNotificationEnabled: boolean;
  pushNotificationEnabled: boolean;
  allowSearchByEmail: boolean;
};

export type UserSession = {
  id: string;
  deviceName: string;
  browser: string;
  operatingSystem: string;
  platform: string;
  location: string;
  ipAddress: string;
  expiresAt: string;
  currentSession: boolean;
};

export type UserSettingsOverview = {
  profile: UserProfile;
  settings: UserSettings;
  sessions: UserSession[];
};

export type UpdateUserProfileRequest = Partial<UserProfile>;

export interface AvatarPresignedUrlRequest {
  fileName: string;
  contentType: string;
}

export interface AvatarPresignedUrlResponse {
  presignedUrl: string;
  fileUrl: string;
}

export interface UpdatePrivacySettingsRequest {
  allowSearchByEmail: boolean;
}

export interface RevokeUserSessionRequest {
  sessionId: string;
  password?: string;
}

export type BulkUserProfileResponse = Pick<
  UserProfile,
  "email" | "fullName" | "avatarUrl"
>;

export interface UploadAvatarRequest {
  file: File;
  currentProfile?: UserProfile | null;
}
