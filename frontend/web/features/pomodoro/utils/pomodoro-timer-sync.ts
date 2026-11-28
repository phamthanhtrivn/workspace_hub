import { isAxiosError } from "axios";
import { isRecoverableApiError } from "@/lib/api-error-policy";
import type { CalendarPomodoroTimerState } from "@/features/calendar/types/calendar.types";
import { POMODORO_SYNC_RETRY_DELAYS_MS } from "../constants/pomodoro-sync";
import { timerSnapshotSignature, type PendingTimerState } from "./pomodoro-timer-snapshot";

export type PomodoroTimerSyncStatus = "synced" | "saving" | "pending" | "error";
interface TimerSyncOptions {
  read: (signal: AbortSignal) => Promise<CalendarPomodoroTimerState | null>;
  write: (snapshot: PendingTimerState, version: number, signal: AbortSignal) => Promise<CalendarPomodoroTimerState>;
  onSaved: (saved: CalendarPomodoroTimerState) => void;
  onPendingVersion?: (snapshot: PendingTimerState, version: number) => void;
  onRemote: (remote: CalendarPomodoroTimerState | null, conflict: boolean) => void;
  onConflict?: () => void;
}

/** Single writer with version reconciliation before retrying an uncertain PUT. */
export function createPomodoroTimerSync(options: TimerSyncOptions) {
  let active = false;
  let generation = 0;
  let inFlight = false;
  let initialized = false;
  let version = 0;
  let pending: PendingTimerState | null = null;
  let uncertain: { snapshot: PendingTimerState; version: number } | null = null;
  let readRequired = false;
  let remoteRequired = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let status: PomodoroTimerSyncStatus = "synced";
  const listeners = new Set<() => void>();

  function setStatus(next: PomodoroTimerSyncStatus) {
    if (status === next) return;
    status = next;
    listeners.forEach((listener) => listener());
  }
  function schedule(error: unknown) {
    clearTimeout(timer);
    timer = undefined;
    if (!isRecoverableApiError(error)) {
      setStatus("error");
      return;
    }
    setStatus("pending");
    const delay = POMODORO_SYNC_RETRY_DELAYS_MS[Math.min(attempt++, POMODORO_SYNC_RETRY_DELAYS_MS.length - 1)];
    timer = setTimeout(() => { timer = undefined; void flush(); }, delay);
  }
  function acknowledge(saved: CalendarPomodoroTimerState) {
    version = saved.version;
    if (pending && timerSnapshotSignature(pending) === timerSnapshotSignature(saved)) pending = null;
    if (pending) options.onPendingVersion?.(pending, version);
    else options.onSaved(saved);
  }
  async function flush() {
    if (!active || !initialized || inFlight || (!pending && !readRequired)) return;
    const run = generation;
    inFlight = true;
    controller = new AbortController();
    const signal = controller.signal;
    setStatus("saving");
    try {
      if (readRequired) {
        const remote = await options.read(signal);
        if (!active || run !== generation) return;
        const remoteVersion = remote?.version ?? 0;
        const acknowledged = remote && uncertain
          && remoteVersion === uncertain.version + 1
          && timerSnapshotSignature(remote) === timerSnapshotSignature(uncertain.snapshot);
        if (acknowledged) {
          acknowledge(remote);
        } else if (remoteRequired || remoteVersion !== version || !pending) {
          // Another device won, or there is no local change to replay.
          const conflict = remoteRequired || Boolean(pending && remoteVersion !== version);
          pending = null;
          version = remoteVersion;
          options.onRemote(remote, conflict);
        }
        uncertain = null;
        remoteRequired = readRequired = false;
      }
      while (pending) {
        const snapshot = pending;
        const expectedVersion = version;
        // Keep this until a response or a subsequent GET confirms the outcome.
        uncertain = { snapshot, version: expectedVersion };
        const saved = await options.write(snapshot, expectedVersion, signal);
        if (!active || run !== generation) return;
        if (pending === snapshot) pending = null;
        acknowledge(saved);
        uncertain = null;
      }
      attempt = 0;
      setStatus("synced");
    } catch (error) {
      if (!active || run !== generation) return;
      readRequired = true;
      if (isAxiosError(error) && error.response?.status === 409) {
        pending = uncertain = null;
        remoteRequired = true;
        options.onConflict?.();
        // A 409 definitively rejected our write; fetch the winning state now.
        try {
          const remote = await options.read(signal);
          if (!active || run !== generation) return;
          version = remote?.version ?? 0;
          remoteRequired = readRequired = false;
          options.onRemote(remote, true);
          attempt = 0;
          setStatus("synced");
        } catch (readError) {
          if (active && run === generation) schedule(readError);
        }
      } else {
        schedule(error);
      }
    } finally {
      if (run === generation) {
        inFlight = false;
        controller = undefined;
      }
    }
  }

  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getStatus: () => status,
    getVersion: () => version,
    start() { active = true; },
    stop() {
      active = false;
      generation += 1;
      clearTimeout(timer);
      timer = undefined;
      controller?.abort();
      controller = undefined;
      inFlight = false;
      if (uncertain) readRequired = true;
    },
    initialize(knownVersion: number, reconcile: boolean, snapshot?: PendingTimerState, error?: unknown) {
      version = knownVersion;
      initialized = true;
      pending = snapshot ?? null;
      readRequired = reconcile;
      if (error) schedule(error);
      else void flush();
    },
    enqueue(snapshot: PendingTimerState) {
      pending = snapshot;
      // New local changes replace the queue but must respect an outage backoff.
      if (!timer && status !== "error") void flush();
    },
    retry() {
      clearTimeout(timer);
      timer = undefined;
      void flush();
    },
  };
}
