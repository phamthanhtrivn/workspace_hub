"use client";

import { useCallback, useState } from "react";
import type { MeetingPreJoinSettings } from "../types/meeting.types";
import {
  loadMeetingDeviceSettings,
  saveMeetingDeviceSettings,
} from "../utils/meeting-device-storage";

export function useMeetingDeviceSettings() {
  const [settings, setSettingsState] = useState<MeetingPreJoinSettings>(
    loadMeetingDeviceSettings,
  );

  const setSettings = useCallback((nextSettings: MeetingPreJoinSettings) => {
    setSettingsState(nextSettings);
    saveMeetingDeviceSettings(nextSettings);
  }, []);

  const reloadSettings = useCallback(() => {
    const storedSettings = loadMeetingDeviceSettings();
    setSettingsState(storedSettings);
    return storedSettings;
  }, []);

  return {
    settings,
    setSettings,
    reloadSettings,
    saveSettings: saveMeetingDeviceSettings,
  };
}
