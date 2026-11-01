import { api } from "@/lib/axios";
import { featureSyncRequest } from "@/lib/api-error-policy";
import type { ApiResponse } from "@/features/calendar/types/calendar.types";
import type { PomodoroAmbientPreferences } from "../types/ambient";

const AMBIENT_PREFERENCES_PATH = "/api/calendar/pomodoro/ambient-preferences";

export async function getPomodoroAmbientPreferences(signal?: AbortSignal): Promise<PomodoroAmbientPreferences> {
  const response = await api.get<ApiResponse<PomodoroAmbientPreferences>>(AMBIENT_PREFERENCES_PATH, featureSyncRequest(signal));
  return response.data.data;
}

export async function savePomodoroAmbientPreferences(preferences: PomodoroAmbientPreferences, signal?: AbortSignal): Promise<PomodoroAmbientPreferences> {
  const response = await api.put<ApiResponse<PomodoroAmbientPreferences>>(AMBIENT_PREFERENCES_PATH, preferences, featureSyncRequest(signal));
  return response.data.data;
}
