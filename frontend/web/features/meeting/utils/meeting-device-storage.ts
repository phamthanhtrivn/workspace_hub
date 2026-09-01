import type { MeetingPreJoinSettings } from "../types/meeting.types";

const meetingDeviceSettingsKey = "meetingDeviceSettings";
type MeetingDeviceSettingsStorage = Partial<MeetingPreJoinSettings>;

export const defaultMeetingPreJoinSettings: MeetingPreJoinSettings = {
  cameraEnabled: true,
  microphoneEnabled: true,
  cameraDeviceId: "",
  microphoneDeviceId: "",
  autoAdmin: true,
};

export function loadMeetingDeviceSettings(): MeetingPreJoinSettings {
  if (typeof window === "undefined") return defaultMeetingPreJoinSettings;

  const storedSettings = window.localStorage.getItem(meetingDeviceSettingsKey);
  if (!storedSettings) return defaultMeetingPreJoinSettings;

  try {
    const parsedSettings = JSON.parse(
      storedSettings,
    ) as MeetingDeviceSettingsStorage;

    return {
      ...defaultMeetingPreJoinSettings,
      ...parsedSettings,
      cameraDeviceId: parsedSettings.cameraDeviceId ?? "",
      microphoneDeviceId: parsedSettings.microphoneDeviceId ?? "",
    };
  } catch {
    return defaultMeetingPreJoinSettings;
  }
}

export function saveMeetingDeviceSettings(settings: MeetingPreJoinSettings) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    meetingDeviceSettingsKey,
    JSON.stringify(settings),
  );
}
