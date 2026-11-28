"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getCalendarPomodoroTimerState, saveCalendarPomodoroTimerState } from "@/features/calendar/api/calendar.api";
import type { CalendarPomodoroTimerState } from "@/features/calendar/types/calendar.types";
import { POMODORO_TASK_MESSAGES } from "../constants/pomodoro-task";
import { saveLocalPomodoroTimerState } from "../utils/pomodoro-local-storage";
import { createPomodoroTimerSync, type PomodoroTimerSyncStatus } from "../utils/pomodoro-timer-sync";

export function usePomodoroTimerSync(userId: string, restoreRemote: (remote: CalendarPomodoroTimerState | null) => void, onConflict: () => void) {
  const sync = useMemo(() => createPomodoroTimerSync({
    read: getCalendarPomodoroTimerState,
    write: (snapshot, expectedVersion, signal) => saveCalendarPomodoroTimerState({ ...snapshot, expectedVersion }, signal),
    onSaved: (saved) => saveLocalPomodoroTimerState(userId, saved),
    onPendingVersion: (snapshot, version) => saveLocalPomodoroTimerState(userId, {
      ...snapshot, version, updatedAt: new Date().toISOString(),
    }),
    onConflict,
    onRemote: (remote, conflict) => {
      restoreRemote(remote);
      if (conflict) toast.error(POMODORO_TASK_MESSAGES.conflict);
    },
  }), [userId, restoreRemote, onConflict]);
  const syncStatus = useSyncExternalStore<PomodoroTimerSyncStatus>(sync.subscribe, sync.getStatus, () => "synced");
  useEffect(() => {
    sync.start();
    const retryOnline = () => { if (sync.getStatus() === "pending") sync.retry(); };
    window.addEventListener("online", retryOnline);
    return () => { window.removeEventListener("online", retryOnline); sync.stop(); };
  }, [sync]);
  return { sync, syncStatus, retrySync: sync.retry };
}
