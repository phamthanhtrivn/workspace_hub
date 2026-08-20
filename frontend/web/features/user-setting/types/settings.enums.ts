export enum UserSettingTab {
  PROFILE = "profile",
  GENERAL = "general",
  SESSION = "session",
  PASSWORD = "password",
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
  UPDATE_SETTINGS = "user-setting-update-settings",
  REVOKE_SESSION = "user-setting-revoke-session",
  UPDATE_PASSWORD = "user-setting-update-password",
  SET_FIRST_PASSWORD = "user-setting-set-first-password",
  SEND_PASSWORD_OTP = "user-setting-send-password-otp",
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

export const OTP_RESEND_COOLDOWN_SEC = 60;
