export type UserProfile = {
  email: string;
  fullName: string;
  avatarUrl: string;
  phoneNumber: string;
  dob: string;
  bio: string;
};

export type UserSettings = {
  theme: string;
  language: string;
  timezone: string;
  emailNotificationEnabled: boolean;
  pushNotificationEnabled: boolean;
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
