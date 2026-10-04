import type { PomodoroAmbientPreferences } from "../types/ambient";
import type { AmbientPreferencesSyncStatus } from "../types/pomodoro-preferences";

// One request at a time; a queued snapshot replaces older queued changes.
export function createAmbientPreferencesSync(
  save: (preferences: PomodoroAmbientPreferences, signal: AbortSignal) => Promise<PomodoroAmbientPreferences>,
  onSaved: (preferences: PomodoroAmbientPreferences) => void,
) {
  let active = false;
  let inFlight = false;
  let queued: PomodoroAmbientPreferences | null = null;
  let dueAt = 0;
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestController: AbortController | undefined;
  let status: AmbientPreferencesSyncStatus = "idle";
  const listeners = new Set<() => void>();

  function setStatus(next: AmbientPreferencesSyncStatus) {
    status = next;
    listeners.forEach((listener) => listener());
  }

  async function flush() {
    if (!active || inFlight || !queued) return;
    const delay = dueAt - Date.now();
    if (delay > 0) {
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), delay);
      return;
    }
    inFlight = true;
    const snapshot = queued;
    queued = null;
    setStatus("saving");
    try {
      requestController = new AbortController();
      const saved = await save(snapshot, requestController.signal);
      if (active) {
        onSaved(saved);
        setStatus(queued ? "saving" : "idle");
      }
    } catch {
      // A newer change takes precedence over the failed snapshot.
      queued ??= snapshot;
      clearTimeout(timer);
      if (active) setStatus("error");
    } finally {
      inFlight = false;
      requestController = undefined;
      if (active && queued && status !== "error") void flush();
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getStatus: () => status,
    getRevision: () => revision,
    start() { active = true; },
    stop() { active = false; clearTimeout(timer); requestController?.abort(); },
    schedule(preferences: PomodoroAmbientPreferences, delay = 0) {
      revision += 1;
      queued = preferences;
      dueAt = Date.now() + delay;
      clearTimeout(timer);
      setStatus("saving");
      timer = setTimeout(() => void flush(), delay);
    },
    retry() { void flush(); },
  };
}
