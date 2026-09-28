// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EventSourceType, EventStatus, type CalendarEvent } from "@/features/calendar/types/calendar.types";
import { PomodoroCalendarTaskList } from "./pomodoro-calendar-task-list";

afterEach(cleanup);

function task(id: string, title: string): CalendarEvent {
  return {
    id,
    title,
    startAt: "2026-09-28T09:00:00.000Z",
    endAt: "2026-09-28T09:25:00.000Z",
    sourceType: EventSourceType.TASK,
    status: EventStatus.CONFIRMED,
  } as CalendarEvent;
}

it("supports moving tasks with keyboard arrow keys", () => {
  const onReorder = vi.fn();

  render(<PomodoroCalendarTaskList
    tasks={[task("first", "Task A"), task("second", "Task B")]}
    isSaving={false}
    onSelect={vi.fn()}
    onReorder={onReorder}
  />);

  fireEvent.keyDown(
    screen.getByRole("button", { name: "Kéo task Task B để đổi thứ tự" }),
    { key: "ArrowUp" },
  );

  expect(onReorder).toHaveBeenCalledWith("second", "first");
});

it("starts dragging from the task content instead of requiring the handle", async () => {
  const onReorder = vi.fn();

  render(<PomodoroCalendarTaskList
    tasks={[task("first", "Task A"), task("second", "Task B")]}
    isSaving={false}
    onSelect={vi.fn()}
    onReorder={onReorder}
  />);

  const taskContent = screen.getByRole("button", { name: /^Task B/ });
  fireEvent.mouseDown(taskContent, { button: 0, clientX: 10, clientY: 40 });
  fireEvent.mouseMove(document, { clientX: 10, clientY: 20 });
  fireEvent.mouseUp(document, { clientX: 10, clientY: 10 });

  await waitFor(() => {
    expect(onReorder).toHaveBeenCalledWith("second", "first");
  });
});
