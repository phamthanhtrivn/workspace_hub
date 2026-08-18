export enum UserSettingTab {
  PROFILE = "profile",
  GENERAL = "general",
  SESSION = "session",
}

export const SETTING_TABS = UserSettingTab;

export enum UserSettingQueryKey {
  PROFILE = "user-setting-profile",
  SETTINGS = "user-setting-settings",
  SESSIONS = "user-setting-sessions",
  BULK_PROFILES_BY_EMAILS = "user-setting-bulk-profiles-by-emails",
}

export enum UserSettingMutationKey {
  UPDATE_PROFILE = "user-setting-update-profile",
  UPLOAD_AVATAR = "user-setting-upload-avatar",
  UPDATE_PRIVACY = "user-setting-update-privacy",
  REVOKE_SESSION = "user-setting-revoke-session",
}

export enum UserTheme {
  LIGHT = "light",
  DARK = "dark",
}

export enum UserLanguage {
  EN = "en",
  VI = "vi",
}

export enum UserTimezone {
  ASIA_HO_CHI_MINH = "Asia/Ho_Chi_Minh",
  UTC = "UTC",
}

export enum UserDeviceKeyword {
  MAC = "mac",
  WINDOWS = "windows",
}

export const USER_SETTING_STALE_TIME_MS = 1000 * 60 * 5;
