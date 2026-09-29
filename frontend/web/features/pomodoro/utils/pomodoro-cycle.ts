import type { PomodoroMode } from "../types/pomodoro";

export interface PomodoroCycleStep {
  mode: PomodoroMode;
  cycleCount: number;
}

export function getNextPomodoroCycleStep(
  currentMode: PomodoroMode,
  cycleCount: number,
  longBreakInterval = 2,
): PomodoroCycleStep {
  if (currentMode !== "FOCUS") {
    return { mode: "FOCUS", cycleCount };
  }

  const completedFocusSessions = cycleCount + 1;
  if (completedFocusSessions >= longBreakInterval) {
    return { mode: "LONG_BREAK", cycleCount: 0 };
  }

  return { mode: "SHORT_BREAK", cycleCount: completedFocusSessions };
}
