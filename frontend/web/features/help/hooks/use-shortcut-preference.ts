"use client";

import { useSyncExternalStore } from "react";
import { SHORTCUT_PREFERENCE_KEY } from "../constants/help-shortcuts";

const listeners = new Set<() => void>();
let memoryPreference = true;

function readPreference() {
  try {
    const stored = localStorage.getItem(SHORTCUT_PREFERENCE_KEY);

    return stored === null ? memoryPreference : stored !== "false";
  } catch {
    return memoryPreference;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SHORTCUT_PREFERENCE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function setPreference(enabled: boolean) {
  memoryPreference = enabled;
  try {
    localStorage.setItem(SHORTCUT_PREFERENCE_KEY, String(enabled));
  } catch {
    /* Keep the preference for this page when storage is blocked. */
  }
  listeners.forEach((listener) => listener());
}

const serverPreference = () => true;

export function useShortcutPreference() {
  return [
    useSyncExternalStore(subscribe, readPreference, serverPreference),
    setPreference,
  ] as const;
}
