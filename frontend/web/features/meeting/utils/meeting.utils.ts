import {
  MeetingStorageKey,
  MeetingWindowTarget,
  meetingRoutes,
} from "../types/meeting.constants";
import {
  ApiResponse,
  MeetingDevicePreferences,
  MeetingParticipantStatus,
  MeetingResponse,
} from "../types/meeting.types";

export function normalizeMeetingResponse<T>(payload: unknown): ApiResponse<T> {
  const responsePayload =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const data =
    typeof payload === "object" && payload !== null && "data" in payload
      ? (payload as { data: unknown }).data
      : payload;

  return {
    ...responsePayload,
    data: data as T,
  };
}

export function resolveMeetingJoinUrl(meeting: MeetingResponse) {
  return meeting.joinUrl || meetingRoutes.joinUrl(meeting.joinToken);
}

export function isMeetingHost(meeting: MeetingResponse, userId?: string | null) {
  return Boolean(userId && meeting.hostId === userId);
}

export function getMeetingParticipantStatus(meeting?: MeetingResponse | null) {
  return meeting?.currentParticipant?.status ?? null;
}

export function canRequestMeetingJoin(meeting?: MeetingResponse | null) {
  const status = getMeetingParticipantStatus(meeting);
  return (
    !status ||
    status === MeetingParticipantStatus.REJECTED ||
    status === MeetingParticipantStatus.LEFT ||
    status === MeetingParticipantStatus.REMOVED
  );
}

export function stopPreviewStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function buildDevicePreferencesStorageKey(joinToken: string) {
  return `${MeetingStorageKey.DEVICE_PREFERENCES}:${joinToken}`;
}

export function saveMeetingDevicePreferences(
  joinToken: string,
  preferences: MeetingDevicePreferences,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    buildDevicePreferencesStorageKey(joinToken),
    JSON.stringify(preferences),
  );
}

export function getMeetingDevicePreferences(
  joinToken: string,
): MeetingDevicePreferences {
  const defaultPreferences: MeetingDevicePreferences = {
    isCameraEnabled: true,
    isMicEnabled: true,
  };

  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  const storedValue = window.localStorage.getItem(
    buildDevicePreferencesStorageKey(joinToken),
  );
  if (!storedValue) {
    return defaultPreferences;
  }

  try {
    const preferences = JSON.parse(storedValue) as Partial<MeetingDevicePreferences>;
    return {
      isCameraEnabled:
        typeof preferences.isCameraEnabled === "boolean"
          ? preferences.isCameraEnabled
          : defaultPreferences.isCameraEnabled,
      isMicEnabled:
        typeof preferences.isMicEnabled === "boolean"
          ? preferences.isMicEnabled
          : defaultPreferences.isMicEnabled,
      cameraDeviceId:
        typeof preferences.cameraDeviceId === "string"
          ? preferences.cameraDeviceId
          : undefined,
      micDeviceId:
        typeof preferences.micDeviceId === "string"
          ? preferences.micDeviceId
          : undefined,
    };
  } catch {
    return defaultPreferences;
  }
}

export async function getSanitizedMeetingDevicePreferences(
  joinToken: string,
): Promise<MeetingDevicePreferences> {
  const preferences = getMeetingDevicePreferences(joinToken);

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return preferences;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameraDevices = devices.filter((device) => device.kind === "videoinput");
    const micDevices = devices.filter((device) => device.kind === "audioinput");
    const cameraDeviceId =
      preferences.cameraDeviceId &&
      cameraDevices.some((device) => device.deviceId === preferences.cameraDeviceId)
        ? preferences.cameraDeviceId
        : undefined;
    const micDeviceId =
      preferences.micDeviceId &&
      micDevices.some((device) => device.deviceId === preferences.micDeviceId)
        ? preferences.micDeviceId
        : undefined;
    const sanitizedPreferences = {
      ...preferences,
      cameraDeviceId,
      micDeviceId,
    };

    if (
      sanitizedPreferences.cameraDeviceId !== preferences.cameraDeviceId ||
      sanitizedPreferences.micDeviceId !== preferences.micDeviceId
    ) {
      saveMeetingDevicePreferences(joinToken, sanitizedPreferences);
    }

    return sanitizedPreferences;
  } catch {
    return preferences;
  }
}

export function openMeetingWindow(): Window | null {
  if (typeof window === "undefined") return null;
  return window.open("", MeetingWindowTarget.NEW_TAB);
}

export function navigateMeetingWindow(
  meetingWindow: Window | null,
  joinToken: string,
) {
  const joinUrl = meetingRoutes.joinUrl(joinToken);
  if (meetingWindow) {
    meetingWindow.opener = null;
    meetingWindow.location.href = joinUrl;
    return;
  }
  window.location.href = joinUrl;
}
