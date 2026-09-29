// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PomodoroTaskActions } from "./pomodoro-task-actions";

afterEach(cleanup);
const projectTask = { id: "task-1", projectId: "project-1", title: "Project task" };

it("requires confirmation before setting a Project task to Done", async () => {
  const onAction = vi.fn().mockResolvedValue(undefined);
  render(<PomodoroTaskActions task={projectTask} timerStatus="RUNNING" disabled={false} onAction={onAction} />);
  fireEvent.click(screen.getByRole("button", { name: "Dừng phiên & hoàn thành task" }));
  expect(onAction).not.toHaveBeenCalled();
  expect(screen.getByText(/hiện chưa thể mở lại/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận hoàn thành" }));
  await waitFor(() => expect(onAction).toHaveBeenCalledWith("COMPLETE"));
});

it("completes Calendar directly and uses a stop-session label while paused", async () => {
  const onAction = vi.fn().mockResolvedValue(undefined);
  render(<PomodoroTaskActions task={{ id: "task", calendarEventId: "event", title: "Calendar task" }} timerStatus="PAUSED" disabled={false} onAction={onAction} />);
  fireEvent.click(screen.getByRole("button", { name: "Dừng phiên & hoàn thành task" }));
  await waitFor(() => expect(onAction).toHaveBeenCalledWith("COMPLETE"));
  expect(screen.queryByRole("button", { name: "Gửi duyệt" })).toBeNull();
});

it("sends a Project task for review without completing it", async () => {
  const onAction = vi.fn().mockResolvedValue(undefined);
  render(<PomodoroTaskActions task={projectTask} timerStatus="IDLE" disabled={false} onAction={onAction} />);
  fireEvent.click(screen.getByRole("button", { name: "Gửi duyệt" }));
  await waitFor(() => expect(onAction).toHaveBeenCalledWith("REVIEW"));
});

it("explains incomplete subtasks and permits retry from the confirmation dialog", async () => {
  const onAction = vi.fn().mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { message: "Complete all subtasks before marking this task as done." } } }).mockResolvedValue(undefined);
  render(<PomodoroTaskActions task={projectTask} timerStatus="IDLE" disabled={false} onAction={onAction} />);
  fireEvent.click(screen.getByRole("button", { name: "Hoàn thành task" }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận hoàn thành" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Hãy hoàn thành tất cả task con trước khi hoàn thành task này.");
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận hoàn thành" }));
  await waitFor(() => expect(onAction).toHaveBeenCalledTimes(2));
});

it("disables actions during saving and hides review for a task already in review", () => {
  const onAction = vi.fn();
  render(<PomodoroTaskActions task={{ ...projectTask, projectStatus: "IN_REVIEW" }} timerStatus="IDLE" disabled onAction={onAction} />);
  expect(screen.queryByRole("button", { name: "Gửi duyệt" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Hoàn thành task" }));
  expect(onAction).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Xác nhận hoàn thành" })).toBeNull();
});
