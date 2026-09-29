// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_POMODORO_CONFIG } from "../api/pomodoro-server.api";
import {
  loadLocalPomodoroConfig,
  loadLocalPomodoroTimerState,
  saveLocalPomodoroConfig,
  saveLocalPomodoroTimerState,
} from "./pomodoro-local-storage";

describe("pomodoro local storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips config and timer state", () => {
    const timerState = {
      mode: "FOCUS" as const,
      status: "RUNNING" as const,
      targetEndAt: new Date(Date.now() + 60_000).toISOString(),
      remainingSeconds: 60,
      cycleCount: 1,
      sessionStartAt: new Date().toISOString(),
      eventId: null,
      taskId: null,
      activeTask: null,
      notes: "local note",
      version: 3,
      updatedAt: new Date().toISOString(),
    };

    saveLocalPomodoroConfig(DEFAULT_POMODORO_CONFIG);
    saveLocalPomodoroTimerState(timerState);

    expect(loadLocalPomodoroConfig()).toEqual(DEFAULT_POMODORO_CONFIG);
    expect(loadLocalPomodoroTimerState()).toEqual(timerState);
  });

  it("ignores corrupted data", () => {
    window.localStorage.setItem("workspace-hub:pomodoro:config", "not-json");
    window.localStorage.setItem(
      "workspace-hub:pomodoro:timer-state",
      JSON.stringify({ schemaVersion: 1, value: { mode: "UNKNOWN" } }),
    );

    expect(loadLocalPomodoroConfig()).toBeNull();
    expect(loadLocalPomodoroTimerState()).toBeNull();
  });
});
