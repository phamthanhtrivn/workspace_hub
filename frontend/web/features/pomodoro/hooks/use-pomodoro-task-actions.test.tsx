// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { updateCalendarTaskCompletion } from "@/features/calendar/api/calendar.api";
import { updateTask } from "@/features/project/api/task.api";
import { usePomodoroTaskActions } from "./use-pomodoro-task-actions";
import type { PomodoroActiveTask } from "../types/pomodoro";

vi.mock("@/features/calendar/api/calendar.api", () => ({ updateCalendarTaskCompletion: vi.fn() }));
vi.mock("@/features/project/api/task.api", () => ({ updateTask: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function setup(task: PomodoroActiveTask) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const finish = vi.fn(async (update: (task: PomodoroActiveTask) => Promise<void>) => update(task));
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...renderHook(() => usePomodoroTaskActions(finish), { wrapper }), invalidate };
}

it("completes the selected Calendar occurrence and provides undo against the same event", async () => {
  const { result, invalidate } = setup({ id: "task-1", calendarEventId: "occurrence-1", title: "Calendar task" });
  await act(async () => { await result.current.runTaskAction("COMPLETE"); });
  expect(updateCalendarTaskCompletion).toHaveBeenCalledWith("occurrence-1", true);
  expect(updateTask).not.toHaveBeenCalled();
  expect(result.current.taskRevision).toBe(1);
  expect(invalidate).toHaveBeenCalled();
  const options = vi.mocked(toast.success).mock.calls[0][1];
  const action = options?.action as { label: string; onClick: () => void };
  expect(action.label).toBe("Hoàn tác");
  await act(async () => { action.onClick(); });
  expect(updateCalendarTaskCompletion).toHaveBeenLastCalledWith("occurrence-1", false);
  expect(result.current.taskRevision).toBe(2);
});

it.each([["REVIEW", "IN_REVIEW"], ["COMPLETE", "DONE"]] as const)("routes Project %s to its owning API", async (action, status) => {
  const { result, invalidate } = setup({ id: "project-task-1", projectId: "project-1", title: "Project task" });
  await act(async () => { await result.current.runTaskAction(action); });
  expect(updateTask).toHaveBeenCalledWith("project-task-1", { status });
  expect(updateCalendarTaskCompletion).not.toHaveBeenCalled();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["projects"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tasks", "project-task-1"] });
  expect(vi.mocked(toast.success).mock.calls[0][1]).toBeUndefined();
});

it("does not clear lists or announce success after a source rejection", async () => {
  vi.mocked(updateTask).mockRejectedValue(new Error("Complete subtasks first"));
  const { result, invalidate } = setup({ id: "project-task-1", projectId: "project-1", title: "Project task" });
  await act(async () => { await expect(result.current.runTaskAction("COMPLETE")).rejects.toThrow("Complete subtasks first"); });
  expect(result.current.taskRevision).toBe(0);
  expect(invalidate).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
