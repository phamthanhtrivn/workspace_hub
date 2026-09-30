// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_POMODORO_CONFIG } from "../api/pomodoro-server.api";
import {
  loadLocalPomodoroConfig,
  loadLocalPomodoroTimerState,
  saveLocalPomodoroConfig,
  saveLocalPomodoroTimerState,
  clearLocalPomodoroData,
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

    saveLocalPomodoroConfig("user-a", DEFAULT_POMODORO_CONFIG);
    saveLocalPomodoroTimerState("user-a", timerState);

    expect(loadLocalPomodoroConfig("user-a")).toEqual(DEFAULT_POMODORO_CONFIG);
    expect(loadLocalPomodoroTimerState("user-a")).toEqual(timerState);
  });

  it("ignores corrupted data", () => {
    window.localStorage.setItem("workspace-hub:pomodoro:config:user-a", "not-json");
    window.localStorage.setItem(
      "workspace-hub:pomodoro:timer-state:user-a",
      JSON.stringify({ schemaVersion: 1, value: { mode: "UNKNOWN" } }),
    );

    expect(loadLocalPomodoroConfig("user-a")).toBeNull();
    expect(loadLocalPomodoroTimerState("user-a")).toBeNull();
  });

  it("isolates users and removes only the signed-out user's data", () => {
    saveLocalPomodoroConfig("user-a", { ...DEFAULT_POMODORO_CONFIG, focusDuration: 40 });
    saveLocalPomodoroConfig("user-b", DEFAULT_POMODORO_CONFIG);
    const state = {
      mode: "FOCUS" as const, status: "PAUSED" as const, targetEndAt: null,
      remainingSeconds: 900, plannedSeconds: 1500, cycleCount: 0,
      sessionStartAt: new Date().toISOString(), eventId: null, taskId: null,
      activeTask: { title: "Private task" }, notes: "Private notes", version: 1,
      updatedAt: new Date().toISOString(),
    };
    saveLocalPomodoroTimerState("user-a", state);
    expect(loadLocalPomodoroTimerState("user-b")).toBeNull();
    expect(loadLocalPomodoroTimerState("user-a")).toEqual(state);
    clearLocalPomodoroData("user-a");
    expect(loadLocalPomodoroConfig("user-a")).toBeNull();
    expect(loadLocalPomodoroTimerState("user-a")).toBeNull();
    expect(loadLocalPomodoroConfig("user-b")).toEqual(DEFAULT_POMODORO_CONFIG);
  });

  it("discards unowned legacy data instead of assigning it to the next user", () => {
    localStorage.setItem("workspace-hub:pomodoro:config", JSON.stringify({ schemaVersion: 1, value: DEFAULT_POMODORO_CONFIG }));
    localStorage.setItem("workspace-hub:pomodoro:timer-state", "private legacy data");
    expect(loadLocalPomodoroConfig("user-b")).toBeNull();
    expect(loadLocalPomodoroTimerState("user-b")).toBeNull();
    expect(localStorage.getItem("workspace-hub:pomodoro:config")).toBeNull();
    expect(localStorage.getItem("workspace-hub:pomodoro:timer-state")).toBeNull();
  });
});
