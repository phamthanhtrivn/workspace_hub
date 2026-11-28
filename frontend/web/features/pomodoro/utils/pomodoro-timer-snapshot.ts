import type { CalendarPomodoroTimerState } from "@/features/calendar/types/calendar.types";
import { limitPomodoroNotes } from "./pomodoro-notes";

export type PendingTimerState = Omit<CalendarPomodoroTimerState, "version" | "updatedAt" | "status"> & {
  status: "IDLE" | "RUNNING" | "PAUSED";
};

export function toPendingTimerState(state: PendingTimerState): PendingTimerState {
  return {
    plannedSeconds: state.plannedSeconds ?? null, mode: state.mode, status: state.status,
    targetEndAt: state.targetEndAt, remainingSeconds: state.remainingSeconds,
    cycleCount: state.cycleCount, sessionStartAt: state.sessionStartAt,
    eventId: state.eventId ?? null, taskId: state.taskId ?? null,
    activeTask: state.activeTask ?? null, notes: limitPomodoroNotes(state.notes),
  };
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .filter(([, entry]) => entry !== undefined).map(([key, entry]) => [key, canonicalJson(entry)]));
  }
  return value;
}

export function timerSnapshotSignature(state: PendingTimerState): string {
  const snapshot = toPendingTimerState(state);
  return JSON.stringify(canonicalJson({ ...snapshot,
    targetEndAt: snapshot.targetEndAt ? new Date(snapshot.targetEndAt).toISOString() : null,
    sessionStartAt: snapshot.sessionStartAt ? new Date(snapshot.sessionStartAt).toISOString() : null,
  }));
}
