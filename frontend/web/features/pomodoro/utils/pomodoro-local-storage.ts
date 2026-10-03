import type { CalendarPomodoroTimerState } from "@/features/calendar/types/calendar.types";
import type { PomodoroConfig } from "../types/pomodoro";
import { isAmbientTrackId, isLegacyCustomTrackId, normalizeAmbientPreferences, type PomodoroAmbientPreferences } from "../types/ambient";
import type { PomodoroViewMode } from "../types/pomodoro-preferences";

const STORAGE_SCHEMA_VERSION = 1;
const CONFIG_KEY = "workspace-hub:pomodoro:config";
const TIMER_STATE_KEY = "workspace-hub:pomodoro:timer-state";
const PENDING_CONFIG_KEY = "workspace-hub:pomodoro:pending-config";
const VIEW_MODE_KEY = "workspace-hub:pomodoro:view-mode";
const AMBIENT_PREFERENCES_KEY = "workspace-hub:pomodoro:ambient-preferences";
const PENDING_AMBIENT_PREFERENCES_KEY = "workspace-hub:pomodoro:pending-ambient-preferences";

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
    (value.plannedSeconds == null || (Number.isInteger(value.plannedSeconds) &&
      Number(value.plannedSeconds) >= 1 && Number(value.plannedSeconds) <= 86400)) &&
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

function removeLegacyStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(TIMER_STATE_KEY);
  } catch {
    // Storage may be disabled.
  }
}

export function loadLocalPomodoroConfig(userId: string): PomodoroConfig | null {
  removeLegacyStorage();
  return userId ? readEnvelope(`${CONFIG_KEY}:${userId}`, isPomodoroConfig) : null;
}

export function loadPendingPomodoroConfig(userId: string): PomodoroConfig | null {
  return userId ? readEnvelope(`${PENDING_CONFIG_KEY}:${userId}`, isPomodoroConfig) : null;
}

export function saveLocalPomodoroConfig(userId: string, config: PomodoroConfig, pending = false): void {
  if (!userId) return;
  const unsynced = loadPendingPomodoroConfig(userId);
  if (!pending && unsynced && JSON.stringify(unsynced) !== JSON.stringify(config)) return;
  writeEnvelope(`${CONFIG_KEY}:${userId}`, config);
  if (pending) {
    writeEnvelope(`${PENDING_CONFIG_KEY}:${userId}`, config);
  } else if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(`${PENDING_CONFIG_KEY}:${userId}`);
    } catch {
      // Storage may be disabled.
    }
  }
}

export function loadLocalPomodoroTimerState(userId: string): CalendarPomodoroTimerState | null {
  removeLegacyStorage();
  return userId ? readEnvelope(`${TIMER_STATE_KEY}:${userId}`, isTimerState) : null;
}

export function saveLocalPomodoroTimerState(userId: string, state: CalendarPomodoroTimerState): void {
  if (userId) writeEnvelope(`${TIMER_STATE_KEY}:${userId}`, state);
}

export function clearLocalPomodoroData(userId: string): void {
  removeLegacyStorage();
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(`${CONFIG_KEY}:${userId}`);
    window.localStorage.removeItem(`${TIMER_STATE_KEY}:${userId}`);
    window.localStorage.removeItem(`${PENDING_CONFIG_KEY}:${userId}`);
  } catch {
    // Storage may be disabled.
  }
}

export function loadLocalPomodoroViewMode(userId: string): PomodoroViewMode | null {
  return userId ? readEnvelope(`${VIEW_MODE_KEY}:${userId}`,
    (value): value is PomodoroViewMode => value === "full" || value === "focus") : null;
}

export function saveLocalPomodoroViewMode(userId: string, viewMode: PomodoroViewMode): void {
  if (userId) writeEnvelope(`${VIEW_MODE_KEY}:${userId}`, viewMode);
}

function isAmbientPreferences(value: unknown): value is PomodoroAmbientPreferences {
  return isRecord(value) && (isAmbientTrackId(value.trackId) || isLegacyCustomTrackId(value.trackId)) &&
    typeof value.volume === "number" && Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 1 &&
    typeof value.autoPlayOnFocus === "boolean";
}

function readAmbientPreferences(key: string): PomodoroAmbientPreferences | null {
  const stored = readEnvelope(key, isAmbientPreferences);
  if (!stored) return null;
  const normalized = normalizeAmbientPreferences(stored);
  if (normalized !== stored) writeEnvelope(key, normalized);
  return normalized;
}

export function loadLocalAmbientPreferences(userId: string): PomodoroAmbientPreferences | null {
  return userId ? readAmbientPreferences(`${AMBIENT_PREFERENCES_KEY}:${userId}`) : null;
}

export function loadPendingAmbientPreferences(userId: string): PomodoroAmbientPreferences | null {
  return userId ? readAmbientPreferences(`${PENDING_AMBIENT_PREFERENCES_KEY}:${userId}`) : null;
}

export function saveLocalAmbientPreferences(userId: string, preferences: PomodoroAmbientPreferences, pending = false): void {
  if (!userId) return;
  preferences = normalizeAmbientPreferences(preferences);
  const unsynced = loadPendingAmbientPreferences(userId);
  if (!pending && unsynced && JSON.stringify(unsynced) !== JSON.stringify(preferences)) return;
  writeEnvelope(`${AMBIENT_PREFERENCES_KEY}:${userId}`, preferences);
  if (pending) {
    writeEnvelope(`${PENDING_AMBIENT_PREFERENCES_KEY}:${userId}`, preferences);
  } else if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(`${PENDING_AMBIENT_PREFERENCES_KEY}:${userId}`);
    } catch {
      // Storage may be disabled. The in-memory save queue still works.
    }
  }
}
