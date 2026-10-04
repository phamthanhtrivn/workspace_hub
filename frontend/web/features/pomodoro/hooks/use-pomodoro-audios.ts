"use client";

import { useQuery } from "@tanstack/react-query";
import { getPomodoroAudios } from "../api/pomodoro-audios.api";
import { POMODORO_AUDIO_STALE_TIME_MS } from "../constants/pomodoro-audio";

export function usePomodoroAudios(userId: string) {
  return useQuery({
    queryKey: ["pomodoro", "audios", userId],
    queryFn: ({ signal }) => getPomodoroAudios(signal),
    enabled: Boolean(userId),
    staleTime: POMODORO_AUDIO_STALE_TIME_MS,
    retry: false,
  });
}
