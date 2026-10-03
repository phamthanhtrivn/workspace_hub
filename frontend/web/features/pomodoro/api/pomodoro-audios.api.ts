import { api } from "@/lib/axios";
import type { ApiResponse } from "@/features/calendar/types/calendar.types";
import { POMODORO_AUDIO_API_PATH } from "../constants/pomodoro-audio";
import type { PomodoroAudio } from "../types/ambient";

export async function getPomodoroAudios(signal?: AbortSignal): Promise<PomodoroAudio[]> {
  const response = await api.get<ApiResponse<PomodoroAudio[]>>(POMODORO_AUDIO_API_PATH, { signal });
  return response.data.data;
}
