import type { PomodoroCompletionStatus, PomodoroStatus } from "../types/pomodoro";
import { POMODORO_SESSION_COPY } from "../constants/pomodoro-session";

export function formatTimerClock(seconds: number): string {
  const remaining = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
}

export function timerProgress(timeLeft: number, totalDuration: number): number {
  if (totalDuration <= 0) return 0;
  return Math.max(0, Math.min(100, (1 - timeLeft / totalDuration) * 100));
}

export function timerStatusLabel(status: PomodoroStatus, finished: boolean, completionStatus: PomodoroCompletionStatus): string {
  if (finished) return completionStatus === "error" ? POMODORO_SESSION_COPY.waiting : POMODORO_SESSION_COPY.saving;
  return status === "PAUSED" ? "Paused" : status === "RUNNING" ? "Running" : "Ready for the next session";
}
