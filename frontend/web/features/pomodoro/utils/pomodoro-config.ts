import type { PomodoroConfig, PomodoroMode, PomodoroStatus } from "../types/pomodoro";

// Keep server metadata and other preference groups out of the timer contract.
export function toPomodoroConfig(config: PomodoroConfig): PomodoroConfig {
  return {
    focusDuration: config.focusDuration,
    shortBreak: config.shortBreak,
    longBreak: config.longBreak,
    longBreakInterval: config.longBreakInterval,
    autoStartBreak: config.autoStartBreak,
    autoStartFocus: config.autoStartFocus,
    soundEnabled: config.soundEnabled,
    soundType: config.soundType,
    soundVolume: config.soundVolume,
    notificationEnabled: config.notificationEnabled,
    dailyGoalPomodoros: config.dailyGoalPomodoros,
  };
}

export function getDurationForMode(mode: PomodoroMode, config: PomodoroConfig): number {
  switch (mode) {
    case "FOCUS": return config.focusDuration * 60;
    case "SHORT_BREAK": return config.shortBreak * 60;
    case "LONG_BREAK": return config.longBreak * 60;
  }
}

export function getUpdatedIdleDuration(previous: PomodoroConfig, next: PomodoroConfig, mode: PomodoroMode, status: PomodoroStatus): number | null {
  if (status !== "IDLE" || JSON.stringify(previous) === JSON.stringify(next)) return null;
  return getDurationForMode(mode, next);
}
