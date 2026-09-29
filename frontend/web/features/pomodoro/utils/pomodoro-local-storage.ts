import type { CalendarPomodoroTimerState } from "@/features/calendar/types/calendar.types";
import type { PomodoroConfig } from "../types/pomodoro";

const STORAGE_SCHEMA_VERSION = 1;
const CONFIG_KEY = "workspace-hub:pomodoro:config";
const TIMER_STATE_KEY = "workspace-hub:pomodoro:timer-state";

interface StorageEnvelope<T> {
  schemaVersion: number;
  value: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readEnvelope<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== STORAGE_SCHEMA_VERSION ||
      !isValid(parsed.value)
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeEnvelope<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    const envelope: StorageEnvelope<T> = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      value,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Storage may be disabled or full. Server synchronization still works.
  }
}

function isPomodoroConfig(value: unknown): value is PomodoroConfig {
  if (!isRecord(value)) return false;
  return (
    Number.isFinite(value.focusDuration) &&
    Number.isFinite(value.shortBreak) &&
    Number.isFinite(value.longBreak) &&
    Number.isFinite(value.longBreakInterval) &&
    typeof value.autoStartBreak === "boolean" &&
    typeof value.autoStartFocus === "boolean" &&
    typeof value.soundEnabled === "boolean" &&
    ["chime", "bell", "digital"].includes(String(value.soundType)) &&
    Number.isFinite(value.soundVolume) &&
    typeof value.notificationEnabled === "boolean" &&
    Number.isFinite(value.dailyGoalPomodoros)
  );
}

function isTimerState(value: unknown): value is CalendarPomodoroTimerState {
  if (!isRecord(value)) return false;
  return (
    ["FOCUS", "SHORT_BREAK", "LONG_BREAK"].includes(String(value.mode)) &&
    ["IDLE", "RUNNING", "PAUSED"].includes(String(value.status)) &&
    (value.targetEndAt === null || typeof value.targetEndAt === "string") &&
    Number.isFinite(value.remainingSeconds) &&
    Number.isFinite(value.cycleCount) &&
    (value.sessionStartAt === null || typeof value.sessionStartAt === "string") &&
    (value.eventId === null || typeof value.eventId === "string") &&
    (value.taskId === null || typeof value.taskId === "string") &&
    (value.activeTask === null || isRecord(value.activeTask)) &&
    typeof value.notes === "string" &&
    Number.isFinite(value.version) &&
    typeof value.updatedAt === "string"
  );
}

export function loadLocalPomodoroConfig(): PomodoroConfig | null {
  return readEnvelope(CONFIG_KEY, isPomodoroConfig);
}

export function saveLocalPomodoroConfig(config: PomodoroConfig): void {
  writeEnvelope(CONFIG_KEY, config);
}

export function loadLocalPomodoroTimerState(): CalendarPomodoroTimerState | null {
  return readEnvelope(TIMER_STATE_KEY, isTimerState);
}

export function saveLocalPomodoroTimerState(state: CalendarPomodoroTimerState): void {
  writeEnvelope(TIMER_STATE_KEY, state);
}

