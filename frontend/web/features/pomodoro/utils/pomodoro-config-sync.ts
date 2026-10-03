import type { PomodoroConfig } from "../types/pomodoro";

export type PomodoroConfigSyncStatus = "idle" | "saving" | "error";
interface QueuedConfig {
  config: PomodoroConfig;
  resolve: (config: PomodoroConfig) => void;
  reject: (error: unknown) => void;
}

export function createPomodoroConfigSync(
  save: (config: PomodoroConfig, signal: AbortSignal) => Promise<PomodoroConfig>,
  onSaved: (config: PomodoroConfig) => void,
) {
  let active = false;
  let inFlight = false;
  let queued: QueuedConfig | null = null;
  let failed: PomodoroConfig | null = null;
  let controller: AbortController | undefined;
  let revision = 0;
  let status: PomodoroConfigSyncStatus = "idle";
  const listeners = new Set<() => void>();
  function setStatus(next: PomodoroConfigSyncStatus) {
    status = next;
    listeners.forEach((listener) => listener());
  }
  async function flush() {
    if (!active || inFlight || !queued) return;
    inFlight = true;
    const snapshot = queued;
    queued = null;
    controller = new AbortController();
    setStatus("saving");
    try {
      await save(snapshot.config, controller.signal);
      if (!active) throw new Error("Pomodoro settings closed");
      onSaved(snapshot.config);
      snapshot.resolve(snapshot.config);
      failed = null;
      setStatus(queued ? "saving" : "idle");
    } catch (error) {
      failed = snapshot.config;
      snapshot.reject(error);
      if (active) setStatus("error");
    } finally {
      inFlight = false;
      controller = undefined;
      if (active && queued) void flush();
    }
  }
  function submit(config: PomodoroConfig): Promise<PomodoroConfig> {
    revision += 1;
    failed = null;
    return new Promise((resolve, reject) => {
      queued?.reject(new Error("Replaced by newer Pomodoro settings"));
      queued = { config, resolve, reject };
      void flush();
    });
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getStatus: () => status,
    getRevision: () => revision,
    start() { active = true; },
    stop() {
      active = false;
      controller?.abort();
      queued?.reject(new Error("Pomodoro settings closed"));
      queued = null;
    },
    submit,
    retry() { if (failed && !inFlight && !queued) void submit(failed).catch(() => {}); },
  };
}
