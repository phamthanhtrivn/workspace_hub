// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePomodoroTimer } from "./use-pomodoro-timer";
import { DEFAULT_POMODORO_CONFIG, getPomodoroConfig, recordPomodoroSession, savePomodoroConfig } from "../api/pomodoro-server.api";
import { getCalendarPomodoroTimerState, saveCalendarPomodoroTimerState } from "@/features/calendar/api/calendar.api";
import { loadLocalPomodoroTimerState, saveLocalPomodoroTimerState } from "../utils/pomodoro-local-storage";

vi.mock("../api/pomodoro-server.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/pomodoro-server.api")>()),
  getPomodoroConfig: vi.fn(),
  recordPomodoroSession: vi.fn(),
  savePomodoroConfig: vi.fn(),
}));
vi.mock("@/features/calendar/api/calendar.api", () => ({
  getCalendarPomodoroTimerState: vi.fn(),
  saveCalendarPomodoroTimerState: vi.fn(),
}));
vi.mock("../utils/ambient-audio", () => ({
  ambientAudio: { setPlaybackListener: vi.fn(), setTrack: vi.fn(), setVolume: vi.fn(), pause: vi.fn(), play: vi.fn() },
}));
vi.mock("../utils/audio-storage", () => ({ loadCustomAudioTracks: vi.fn().mockResolvedValue([]) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});

function restoreTaskSession(status: "RUNNING" | "PAUSED" | "IDLE" = "RUNNING") {
  const now = Date.now();
  const task = { id: "11111111-1111-4111-8111-111111111111", calendarEventId: "22222222-2222-4222-8222-222222222222", title: "Current task" };
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG, soundEnabled: false, notificationEnabled: false });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue({
    mode: "FOCUS", status, targetEndAt: status === "RUNNING" ? new Date(now + 1_480_000).toISOString() : null,
    sessionStartAt: status === "IDLE" ? null : new Date(now - 40_000).toISOString(), remainingSeconds: 1480,
    cycleCount: 0, eventId: task.calendarEventId, taskId: task.id, activeTask: task,
    notes: "My note", version: 1, updatedAt: new Date(now).toISOString(),
  });
  vi.mocked(saveCalendarPomodoroTimerState).mockResolvedValue({ version: 2 } as Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>);
  vi.mocked(recordPomodoroSession).mockResolvedValue({ id: "saved" } as Awaited<ReturnType<typeof recordPomodoroSession>>);
  return task;
}

it("does not restore another account's task or notes when the server has no state", async () => {
  restoreTaskSession("PAUSED");
  const first = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(first.result.current.isReady).toBe(true));
  first.unmount();
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue(null);
  const second = renderHook(() => usePomodoroTimer("user-b"));
  await waitFor(() => expect(second.result.current.isReady).toBe(true));
  expect(second.result.current.activeTask).toBeNull();
  expect(second.result.current.notes).toBe("");
  expect(second.result.current.status).toBe("IDLE");
});

it.each(["RUNNING", "PAUSED"] as const)("saves task A before selecting B from %s", async (status) => {
  const task = restoreTaskSession(status);
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  const nextTask = { id: "33333333-3333-4333-8333-333333333333", title: "Task B" };
  await act(async () => result.current.selectTask(nextTask));
  expect(recordPomodoroSession).toHaveBeenCalledWith(expect.objectContaining({ taskId: task.id, actualSeconds: 20, status: "STOPPED" }));
  expect(recordPomodoroSession).toHaveBeenCalledTimes(1);
  expect(result.current.activeTask).toEqual(nextTask);
  expect(result.current.timeLeft).toBe(1500);
  expect(result.current.status).toBe("IDLE");
  expect(result.current.notes).toBe("");
  act(() => result.current.reset());
  expect(recordPomodoroSession).toHaveBeenCalledTimes(1);
});

it("keeps the old task and allows retry when saving during a task switch fails", async () => {
  const task = restoreTaskSession("PAUSED");
  vi.mocked(recordPomodoroSession).mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  const nextTask = { id: "next", title: "Task B" };
  await act(async () => result.current.selectTask(nextTask));
  expect(result.current.activeTask?.id).toBe(task.id);
  expect(result.current.status).toBe("PAUSED");
  expect(result.current.timeLeft).toBe(1480);
  await act(async () => result.current.selectTask(nextTask));
  expect(result.current.activeTask).toEqual(nextTask);
});

it("saves unassigned time before selecting a task and ignores stale metadata updates", async () => {
  restoreTaskSession("PAUSED");
  const state = await getCalendarPomodoroTimerState();
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue({ ...state!, taskId: null, eventId: null, activeTask: null });
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  const task = { id: "new", title: "New task" };
  await act(async () => result.current.selectTask(task));
  expect(recordPomodoroSession).toHaveBeenCalledWith(expect.objectContaining({ taskId: undefined, actualSeconds: 20 }));
  act(() => result.current.updateActiveTask({ id: "old", title: "Late response" }));
  expect(result.current.activeTask).toEqual(task);
});

it.each(["RUNNING", "PAUSED"] as const)("preserves planned duration through config changes and reload from %s", async (status) => {
  restoreTaskSession(status);
  vi.mocked(savePomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG, focusDuration: 40 });
  const first = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(first.result.current.isReady).toBe(true));
  await act(async () => first.result.current.setNotes("persist original duration"));
  await act(async () => first.result.current.updateConfig({ ...DEFAULT_POMODORO_CONFIG, focusDuration: 40 }));
  const snapshot = loadLocalPomodoroTimerState("user-a");
  expect(snapshot?.plannedSeconds).toBe(1500);
  first.unmount();
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG, focusDuration: 40 });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue(snapshot);
  const second = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(second.result.current.isReady).toBe(true));
  expect(second.result.current.totalDuration).toBe(1500);
  await act(async () => second.result.current.selectTask(null));
  expect(recordPomodoroSession).toHaveBeenCalledWith(expect.objectContaining({ actualSeconds: 20, durationMinutes: 25 }));
  expect(second.result.current.totalDuration).toBe(2400);
});

it("limits restored and edited notes before state and session writes", async () => {
  restoreTaskSession("PAUSED");
  const state = await getCalendarPomodoroTimerState();
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue({ ...state!, notes: "x".repeat(2100) });
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(result.current.notes).toHaveLength(2000);
  await act(async () => result.current.setNotes("y".repeat(2100)));
  expect(result.current.notes).toHaveLength(2000);
  expect(saveCalendarPomodoroTimerState).toHaveBeenLastCalledWith(expect.objectContaining({ notes: "y".repeat(2000) }));
  await act(async () => result.current.selectTask(null));
  expect(recordPomodoroSession).toHaveBeenCalledWith(expect.objectContaining({ notes: "y".repeat(2000) }));
});

it("records the original planned duration when a restored session expires after a config change", async () => {
  restoreTaskSession();
  const state = await getCalendarPomodoroTimerState();
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG, focusDuration: 40, soundEnabled: false, notificationEnabled: false });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue({
    ...state!, plannedSeconds: 1500,
    sessionStartAt: new Date(Date.now() - 1_501_000).toISOString(),
    targetEndAt: new Date(Date.now() - 1_000).toISOString(),
  });
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(recordPomodoroSession).toHaveBeenCalledWith(expect.objectContaining({
    status: "COMPLETED", actualSeconds: 1500, durationMinutes: 25,
  })), { timeout: 2500 });
  expect(result.current.mode).toBe("SHORT_BREAK");
});

it("locks task selection until the previous task session is saved", async () => {
  const oldTask = restoreTaskSession("PAUSED");
  let release!: (session: Awaited<ReturnType<typeof recordPomodoroSession>>) => void;
  vi.mocked(recordPomodoroSession).mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  let change!: Promise<void>;
  await act(async () => { change = result.current.selectTask({ id: "b", title: "B" }); });
  expect(result.current.activeTask?.id).toBe(oldTask.id);
  expect(result.current.isTaskActionPending).toBe(true);
  await act(async () => result.current.selectTask({ id: "c", title: "C" }));
  await act(async () => { release({ id: "saved" } as Awaited<ReturnType<typeof recordPomodoroSession>>); await change; });
  expect(result.current.activeTask?.id).toBe("b");
  expect(recordPomodoroSession).toHaveBeenCalledTimes(1);
});

it("does not flush queued writes after the account view unmounts", async () => {
  restoreTaskSession("IDLE");
  let release!: (state: Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>) => void;
  vi.mocked(saveCalendarPomodoroTimerState).mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  const { result, unmount } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  await act(async () => result.current.setNotes("first"));
  await act(async () => result.current.setNotes("queued"));
  unmount();
  await act(async () => release({ version: 2 } as Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>));
  expect(saveCalendarPomodoroTimerState).toHaveBeenCalledTimes(1);
});

it.each(["RUNNING", "PAUSED"] as const)("saves actual focus time before completing a task from %s", async (status) => {
  const task = restoreTaskSession(status);
  const updateSource = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  await act(async () => { await result.current.finishActiveTask(updateSource); });
  expect(recordPomodoroSession).toHaveBeenCalledWith(expect.objectContaining({
    taskId: task.id, eventId: task.calendarEventId, actualSeconds: 20, status: "STOPPED", notes: "My note",
  }));
  expect(vi.mocked(recordPomodoroSession).mock.invocationCallOrder[0]).toBeLessThan(updateSource.mock.invocationCallOrder[0]);
  expect(result.current.activeTask).toBeNull();
  expect(result.current.status).toBe("IDLE");
  expect(result.current.timeLeft).toBe(1500);
});

it("keeps a task and pauses the timer if its session cannot be saved", async () => {
  const task = restoreTaskSession();
  vi.mocked(recordPomodoroSession).mockRejectedValueOnce(new Error("Offline"));
  const updateSource = vi.fn();
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  await act(async () => {
    await expect(result.current.finishActiveTask(updateSource)).rejects.toThrow("Chưa lưu được phiên tập trung");
  });
  expect(updateSource).not.toHaveBeenCalled();
  expect(result.current.activeTask?.id).toBe(task.id);
  expect(result.current.status).toBe("PAUSED");
  expect(result.current.timeLeft).toBe(1480);
  expect(result.current.isTaskActionPending).toBe(false);
  await act(async () => { await result.current.finishActiveTask(updateSource); });
  expect(updateSource).toHaveBeenCalledTimes(1);
});

it("retries a failed source update without recording the stopped session again", async () => {
  const task = restoreTaskSession();
  const updateSource = vi.fn().mockRejectedValueOnce(new Error("Complete subtasks first")).mockResolvedValue(undefined);
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  await act(async () => {
    await expect(result.current.finishActiveTask(updateSource)).rejects.toThrow("Complete subtasks first");
  });
  expect(result.current.activeTask?.id).toBe(task.id);
  expect(result.current.status).toBe("IDLE");
  await act(async () => { await result.current.finishActiveTask(updateSource); });
  expect(recordPomodoroSession).toHaveBeenCalledTimes(1);
  expect(updateSource).toHaveBeenCalledTimes(2);
  expect(result.current.activeTask).toBeNull();
});

it("locks timer controls and rejects duplicate completion while the source update is pending", async () => {
  restoreTaskSession("IDLE");
  let release!: () => void;
  const updateSource = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  let action!: Promise<void>;
  await act(async () => { action = result.current.finishActiveTask(updateSource); });
  expect(result.current.isTaskActionPending).toBe(true);
  act(() => { result.current.start(); result.current.reset(); result.current.skip(); result.current.switchMode("LONG_BREAK"); });
  expect(result.current.status).toBe("IDLE");
  expect(result.current.mode).toBe("FOCUS");
  await expect(result.current.finishActiveTask(updateSource)).rejects.toThrow("Đang lưu phiên");
  expect(updateSource).toHaveBeenCalledTimes(1);
  expect(recordPomodoroSession).not.toHaveBeenCalled();
  await act(async () => { release(); await action; });
  expect(result.current.isTaskActionPending).toBe(false);
});

it("records an expired running session restored from the server", async () => {
  const now = Date.now();
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG, soundEnabled: false, notificationEnabled: false });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue({
    mode: "FOCUS", status: "RUNNING", targetEndAt: new Date(now - 1_000).toISOString(),
    sessionStartAt: new Date(now - 1_501_000).toISOString(), remainingSeconds: 0,
    cycleCount: 0, eventId: null, taskId: null, activeTask: null,
    notes: "", version: 1, updatedAt: new Date(now).toISOString(),
  });
  vi.mocked(saveCalendarPomodoroTimerState).mockResolvedValue({ version: 2 } as Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>);
  vi.mocked(recordPomodoroSession).mockResolvedValue({ id: "saved" } as Awaited<ReturnType<typeof recordPomodoroSession>>);

  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await act(async () => { await Promise.resolve(); });
  expect(result.current.status).toBe("RUNNING");
  await waitFor(() => expect(recordPomodoroSession).toHaveBeenCalledWith(
    expect.objectContaining({ sessionType: "FOCUS", status: "COMPLETED", actualSeconds: 1500 }),
  ), { timeout: 2500 });
  await waitFor(() => expect(result.current.status).toBe("IDLE"));
});

it("restores and records a completed Project task session without a Calendar event", async () => {
  const now = Date.now();
  const taskId = "11111111-1111-4111-8111-111111111111";
  const projectId = "22222222-2222-4222-8222-222222222222";
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG, soundEnabled: false, notificationEnabled: false });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue({
    mode: "FOCUS", status: "RUNNING", targetEndAt: new Date(now - 1_000).toISOString(),
    sessionStartAt: new Date(now - 1_501_000).toISOString(), remainingSeconds: 0,
    cycleCount: 0, eventId: null, taskId,
    activeTask: { id: taskId, projectId, projectName: "Workspace", title: "Project task" },
    notes: "", version: 1, updatedAt: new Date(now).toISOString(),
  });
  vi.mocked(saveCalendarPomodoroTimerState).mockResolvedValue({ version: 2 } as Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>);
  vi.mocked(recordPomodoroSession).mockResolvedValue({ id: "saved" } as Awaited<ReturnType<typeof recordPomodoroSession>>);

  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(recordPomodoroSession).toHaveBeenCalledWith(expect.objectContaining({
    taskId, projectId, projectName: "Workspace", eventId: undefined,
    status: "COMPLETED", actualSeconds: 1500,
  })), { timeout: 2500 });
  await waitFor(() => expect(result.current.activeTask?.completedPomodoros).toBe(1));
});

it("coalesces rapid note edits while preserving the server state version", async () => {
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue(null);
  let resolveFirst!: (value: Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>) => void;
  vi.mocked(saveCalendarPomodoroTimerState)
    .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
    .mockResolvedValue({ version: 2 } as Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>);

  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  await act(async () => { result.current.setNotes("a"); });
  await waitFor(() => expect(saveCalendarPomodoroTimerState).toHaveBeenCalledTimes(1));
  await act(async () => { result.current.setNotes("ab"); });
  await act(async () => { result.current.setNotes("abc"); });
  expect(saveCalendarPomodoroTimerState).toHaveBeenCalledTimes(1);

  await act(async () => { resolveFirst({ version: 1 } as Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>); });
  await waitFor(() => expect(saveCalendarPomodoroTimerState).toHaveBeenCalledTimes(2));
  expect(vi.mocked(saveCalendarPomodoroTimerState).mock.calls[1][0]).toEqual(
    expect.objectContaining({ notes: "abc", expectedVersion: 1 }),
  );
});

it("records a running session before switching timer modes", async () => {
  const now = Date.now();
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue({
    mode: "FOCUS", status: "RUNNING", targetEndAt: new Date(now + 1_460_000).toISOString(),
    sessionStartAt: new Date(now - 40_000).toISOString(), remainingSeconds: 1460,
    cycleCount: 0, eventId: null, taskId: null, activeTask: null,
    notes: "", version: 1, updatedAt: new Date(now).toISOString(),
  });
  vi.mocked(saveCalendarPomodoroTimerState).mockResolvedValue({ version: 2 } as Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>);
  vi.mocked(recordPomodoroSession).mockResolvedValue({ id: "stopped" } as Awaited<ReturnType<typeof recordPomodoroSession>>);

  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));
  await act(async () => { result.current.switchMode("SHORT_BREAK"); });

  expect(recordPomodoroSession).toHaveBeenCalledWith(expect.objectContaining({
    sessionType: "FOCUS", status: "STOPPED",
  }));
  expect(result.current.mode).toBe("SHORT_BREAK");
  expect(result.current.status).toBe("IDLE");
});

it("keeps new settings locally when saving them to the server fails", async () => {
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue(null);
  vi.mocked(savePomodoroConfig).mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));

  await act(async () => {
    await result.current.updateConfig({
      ...DEFAULT_POMODORO_CONFIG,
      focusDuration: 40,
    });
  });
  await waitFor(() => expect(result.current.loadError).toBe(true));
  expect(result.current.config.focusDuration).toBe(40);
});

it("keeps an expired session available for retry when recording fails", async () => {
  const now = Date.now();
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG, soundEnabled: false, notificationEnabled: false });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue({
    mode: "FOCUS", status: "RUNNING", targetEndAt: new Date(now - 1_000).toISOString(),
    sessionStartAt: new Date(now - 1_501_000).toISOString(), remainingSeconds: 0,
    cycleCount: 0, eventId: null, taskId: null, activeTask: null,
    notes: "", version: 1, updatedAt: new Date(now).toISOString(),
  });
  vi.mocked(saveCalendarPomodoroTimerState).mockResolvedValue({ version: 2 } as Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>);
  vi.mocked(recordPomodoroSession).mockRejectedValue(new Error("offline"));

  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(recordPomodoroSession).toHaveBeenCalled(), { timeout: 2500 });
  await act(async () => { await Promise.resolve(); });

  expect(result.current.status).toBe("RUNNING");
  expect(result.current.mode).toBe("FOCUS");
  expect(saveCalendarPomodoroTimerState).not.toHaveBeenCalledWith(expect.objectContaining({ status: "IDLE" }));
});

it("remains usable with local defaults when initial server requests fail", async () => {
  vi.mocked(getPomodoroConfig).mockRejectedValue(new Error("offline"));
  vi.mocked(getCalendarPomodoroTimerState).mockRejectedValue(new Error("offline"));
  vi.mocked(saveCalendarPomodoroTimerState).mockRejectedValue(new Error("offline"));

  const { result } = renderHook(() => usePomodoroTimer("user-a"));

  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(result.current.loadError).toBe(true);
  expect(result.current.config).toEqual(DEFAULT_POMODORO_CONFIG);

  act(() => result.current.start());
  expect(result.current.status).toBe("RUNNING");
});

it("restores the local timer snapshot while the server is offline", async () => {
  saveLocalPomodoroTimerState("user-a", {
    mode: "SHORT_BREAK",
    status: "PAUSED",
    targetEndAt: null,
    remainingSeconds: 123,
    cycleCount: 1,
    sessionStartAt: new Date().toISOString(),
    eventId: null,
    taskId: null,
    activeTask: null,
    notes: "saved offline",
    version: 4,
    updatedAt: new Date().toISOString(),
  });
  vi.mocked(getPomodoroConfig).mockRejectedValue(new Error("offline"));
  vi.mocked(getCalendarPomodoroTimerState).mockRejectedValue(new Error("offline"));
  vi.mocked(saveCalendarPomodoroTimerState).mockRejectedValue(new Error("offline"));

  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));

  expect(result.current.mode).toBe("SHORT_BREAK");
  expect(result.current.status).toBe("PAUSED");
  expect(result.current.timeLeft).toBe(123);
  expect(result.current.notes).toBe("saved offline");
});

it("keeps a running timer usable when server state synchronization fails", async () => {
  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue(null);
  vi.mocked(saveCalendarPomodoroTimerState).mockRejectedValue(new Error("offline"));

  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.isReady).toBe(true));

  act(() => result.current.start());
  await waitFor(() => expect(result.current.loadError).toBe(true));

  expect(result.current.isReady).toBe(true);
  expect(result.current.status).toBe("RUNNING");
});

it("clears degraded mode after the server connection returns", async () => {
  vi.mocked(getPomodoroConfig).mockRejectedValue(new Error("offline"));
  vi.mocked(getCalendarPomodoroTimerState).mockRejectedValue(new Error("offline"));

  const { result } = renderHook(() => usePomodoroTimer("user-a"));
  await waitFor(() => expect(result.current.loadError).toBe(true));

  vi.mocked(getPomodoroConfig).mockResolvedValue({ ...DEFAULT_POMODORO_CONFIG });
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue(null);
  act(() => window.dispatchEvent(new Event("online")));

  await waitFor(() => expect(result.current.loadError).toBe(false));
  expect(result.current.isReady).toBe(true);
});
