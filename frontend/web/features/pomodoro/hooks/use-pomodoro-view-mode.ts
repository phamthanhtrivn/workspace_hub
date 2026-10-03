"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_POMODORO_VIEW_MODE, type PomodoroViewMode } from "../types/pomodoro-preferences";
import { loadLocalPomodoroViewMode, saveLocalPomodoroViewMode } from "../utils/pomodoro-local-storage";

const VIEW_MODE_CHANGED_EVENT = "pomodoro-view-mode-changed";
// Also keep the choice usable when browser storage is disabled.
const viewModes = new Map<string, PomodoroViewMode>();

function subscribe(listener: () => void) {
  const onStorage = () => { viewModes.clear(); listener(); };
  window.addEventListener(VIEW_MODE_CHANGED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(VIEW_MODE_CHANGED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePomodoroViewMode(userId: string) {
  const getSnapshot = useCallback(() => viewModes.get(userId) ?? loadLocalPomodoroViewMode(userId) ?? DEFAULT_POMODORO_VIEW_MODE, [userId]);
  const viewMode = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_POMODORO_VIEW_MODE);
  const setViewMode = useCallback((next: PomodoroViewMode) => {
    viewModes.set(userId, next);
    saveLocalPomodoroViewMode(userId, next);
    window.dispatchEvent(new Event(VIEW_MODE_CHANGED_EVENT));
  }, [userId]);
  return { viewMode, setViewMode };
}
