import type { PomodoroCompletionStatus, PomodoroSessionRecord } from "../types/pomodoro";
import { POMODORO_COMPLETION_RETRY_MS } from "../constants/pomodoro-session";

export interface PomodoroCompletionSnapshot {
  key: string;
  session: Omit<PomodoroSessionRecord, "id">;
}

interface CompletionEffects {
  now: number;
  wasNotified: (key: string) => boolean;
  markNotified: (key: string) => void;
  notify: () => void;
  record: (session: PomodoroCompletionSnapshot["session"]) => Promise<unknown>;
  onStatus: (status: PomodoroCompletionStatus) => void;
  onFirstError: () => void;
}

// One expired session, not an offline queue. Retries keep the original payload.
export function createPomodoroCompletion() {
  let snapshot: PomodoroCompletionSnapshot | null = null;
  let inFlight = false;
  let lastAttempt: number | null = null;
  let notified = false;
  let errorShown = false;
  let saved = false;
  let generation = 0;

  return {
    isCurrent(key: string) { return snapshot?.key === key && saved; },
    clear() {
      generation += 1;
      snapshot = null;
      inFlight = false;
      lastAttempt = null;
      notified = errorShown = saved = false;
    },
    async run(next: PomodoroCompletionSnapshot, effects: CompletionEffects, force = false): Promise<boolean> {
      if (inFlight) return false;
      if (snapshot?.key !== next.key) {
        snapshot = { key: next.key, session: { ...next.session } };
        lastAttempt = null;
        notified = errorShown = saved = false;
        generation += 1;
      }
      if (saved || (!force && lastAttempt !== null && effects.now - lastAttempt < POMODORO_COMPLETION_RETRY_MS)) return false;
      const attemptGeneration = generation;
      inFlight = true;
      lastAttempt = effects.now;
      effects.onStatus("saving");
      if (!notified) {
        notified = true;
        let alreadyNotified = false;
        try { alreadyNotified = effects.wasNotified(snapshot.key); } catch { /* Storage can be unavailable. */ }
        if (!alreadyNotified) {
          try { effects.markNotified(snapshot.key); } catch { /* Keep the in-memory guard. */ }
          try { effects.notify(); } catch { /* Recording must still proceed. */ }
        }
      }
      try {
        await effects.record(snapshot.session);
        if (generation !== attemptGeneration) return false;
        saved = true;
        return true;
      } catch {
        if (generation !== attemptGeneration) return false;
        effects.onStatus("error");
        if (!errorShown) {
          errorShown = true;
          effects.onFirstError();
        }
        return false;
      } finally {
        if (generation === attemptGeneration) inFlight = false;
      }
    },
  };
}
