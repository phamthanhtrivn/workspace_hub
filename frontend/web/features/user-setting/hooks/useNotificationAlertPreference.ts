"use client";

import { useUserSettingsQuery } from "./useUserSettingQueries";

export function useNotificationAlertPreference() {
  const { data: settingsResponse } = useUserSettingsQuery();

  return !(settingsResponse?.data.muteNotification ?? false);
}
